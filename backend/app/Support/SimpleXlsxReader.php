<?php

namespace App\Support;

use ZipArchive;

/**
 * Lecteur XLSX minimal, sans dépendance externe (ZipArchive + DOM).
 * Lit la première feuille et renvoie un tableau de lignes (chaque ligne
 * = tableau indexé par numéro de colonne 0-based -> valeur texte).
 */
class SimpleXlsxReader
{
    /** @return array{0: array<int, array<int,string>>, 1: int} [lignes, nbColonnesMax] */
    public static function read(string $path): array
    {
        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return [[], 0];
        }

        $shared = self::sharedStrings($zip);

        // Trouver la 1re feuille (sheet1.xml par défaut).
        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if ($sheetXml === false) {
            // repli : première worksheet trouvée
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (str_starts_with($name, 'xl/worksheets/') && str_ends_with($name, '.xml')) {
                    $sheetXml = $zip->getFromName($name);
                    break;
                }
            }
        }
        $zip->close();

        if (! $sheetXml) {
            return [[], 0];
        }

        $rows = [];
        $maxCol = 0;
        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadXML($sheetXml);
        libxml_clear_errors();

        foreach ($doc->getElementsByTagName('row') as $rowEl) {
            $cells = [];
            foreach ($rowEl->getElementsByTagName('c') as $c) {
                $ref = $c->getAttribute('r');            // ex: "B3"
                $col = self::colIndex($ref);
                $type = $c->getAttribute('t');
                $val = '';
                if ($type === 'inlineStr') {
                    $tNodes = $c->getElementsByTagName('t');
                    foreach ($tNodes as $t) { $val .= $t->nodeValue; }
                } else {
                    $vNode = $c->getElementsByTagName('v')->item(0);
                    $raw = $vNode ? $vNode->nodeValue : '';
                    if ($type === 's') {
                        $val = $shared[(int) $raw] ?? '';
                    } else {
                        $val = $raw;
                    }
                }
                $cells[$col] = trim((string) $val);
                if ($col + 1 > $maxCol) { $maxCol = $col + 1; }
            }
            $rows[] = $cells;
        }

        return [$rows, $maxCol];
    }

    private static function sharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');
        if ($xml === false) {
            return [];
        }
        $out = [];
        $doc = new \DOMDocument();
        libxml_use_internal_errors(true);
        $doc->loadXML($xml);
        libxml_clear_errors();
        foreach ($doc->getElementsByTagName('si') as $si) {
            $text = '';
            foreach ($si->getElementsByTagName('t') as $t) {
                // Ignore les <t> à l'intérieur de rPh (phonétique) — rare, négligé ici.
                $text .= $t->nodeValue;
            }
            $out[] = $text;
        }
        return $out;
    }

    /** "B3" -> 1 (0-based). */
    private static function colIndex(string $ref): int
    {
        $letters = preg_replace('/[0-9]/', '', $ref);
        $n = 0;
        $len = strlen($letters);
        for ($i = 0; $i < $len; $i++) {
            $n = $n * 26 + (ord($letters[$i]) - 64);
        }
        return max(0, $n - 1);
    }
}
