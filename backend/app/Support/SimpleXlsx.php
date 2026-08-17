<?php

namespace App\Support;

use ZipArchive;

/**
 * Générateur XLSX minimal, sans dépendance externe (OOXML via ZipArchive).
 * - En-tête et ligne de total en gras.
 * - Types : nombre (int/float) ou texte (inlineStr).
 */
class SimpleXlsx
{
    /**
     * @param array $headers  Libellés de colonnes.
     * @param array $rows      Lignes ; chaque ligne = tableau de cellules (string|int|float).
     * @param array|null $footer Ligne de total (facultative).
     * @return string Chemin d'un fichier temporaire .xlsx (à télécharger puis supprimer).
     */
    public static function generate(array $headers, array $rows, ?array $footer = null): string
    {
        $sheet = self::sheetXml($headers, $rows, $footer);

        $files = [
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                .'<Default Extension="xml" ContentType="application/xml"/>'
                .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
                .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
                .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
                .'</Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
                .'</Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                .'<sheets><sheet name="Rapport" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
                .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                .'</Relationships>',
            'xl/styles.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
                .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'
                .'<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
                .'<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
                .'<borders count="1"><border/></borders>'
                .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
                .'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
                .'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
                .'</styleSheet>',
            'xl/worksheets/sheet1.xml' => $sheet,
        ];

        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::OVERWRITE);
        foreach ($files as $name => $content) {
            $zip->addFromString($name, $content);
        }
        $zip->close();

        return $path;
    }

    private static function sheetXml(array $headers, array $rows, ?array $footer): string
    {
        $all = [];
        $all[] = [$headers, 1]; // style 1 = gras
        foreach ($rows as $r) {
            $all[] = [$r, 0];
        }
        if ($footer !== null) {
            $all[] = [$footer, 1];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
        $rowIndex = 1;
        foreach ($all as [$cells, $style]) {
            $xml .= '<row r="'.$rowIndex.'">';
            $col = 0;
            foreach ($cells as $cell) {
                $ref = self::colLetter($col).$rowIndex;
                $xml .= self::cellXml($ref, $cell, $style);
                $col++;
            }
            $xml .= '</row>';
            $rowIndex++;
        }
        $xml .= '</sheetData></worksheet>';

        return $xml;
    }

    private static function cellXml(string $ref, $value, int $style): string
    {
        $s = $style ? ' s="'.$style.'"' : '';
        if (is_int($value) || is_float($value)) {
            return '<c r="'.$ref.'"'.$s.'><v>'.$value.'</v></c>';
        }
        $text = htmlspecialchars((string) $value, ENT_QUOTES | ENT_XML1, 'UTF-8');
        return '<c r="'.$ref.'"'.$s.' t="inlineStr"><is><t xml:space="preserve">'.$text.'</t></is></c>';
    }

    private static function colLetter(int $n): string
    {
        $s = '';
        $n++;
        while ($n > 0) {
            $mod = ($n - 1) % 26;
            $s = chr(65 + $mod).$s;
            $n = intdiv($n - 1, 26);
        }
        return $s;
    }
}
