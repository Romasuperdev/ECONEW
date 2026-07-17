import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import StudentForm from './pages/StudentForm'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import EstablishmentUsers from './pages/EstablishmentUsers'
import Activity from './pages/Activity'
import Expenses from './pages/Expenses'
import Suppliers from './pages/Suppliers'
import Settings from './pages/Settings'
import Treasury from './pages/Treasury'
import Salaries from './pages/Salaries'
import Reports from './pages/Reports'
import Structure from './pages/Structure'
import GrilleScolarite from './pages/GrilleScolarite'
import FichierBaseLayout from './pages/FichierBaseLayout'
import BusPage from './pages/BusPage'
import ChauffeursPage from './pages/ChauffeursPage'
import DestinationsPage from './pages/DestinationsPage'
import GrilleTransport from './pages/GrilleTransport'
import GrilleCantine from './pages/GrilleCantine'
import GrillePension from './pages/GrillePension'
import TraitementLayout from './pages/TraitementLayout'
import RemisePage from './pages/RemisePage'
import TransportElevePage from './pages/TransportElevePage'
import ChauffeurCarPage from './pages/ChauffeurCarPage'
import ReinscriptionTransportPage from './pages/ReinscriptionTransportPage'
import ChangementDestinationPage from './pages/ChangementDestinationPage'
import HistoriquePaiementTransportPage from './pages/HistoriquePaiementTransportPage'
import ElevesParDestinationPage from './pages/ElevesParDestinationPage'
import ElevesParCarPage from './pages/ElevesParCarPage'
import InscriptionServicePage from './pages/InscriptionServicePage'
import ReinscriptionServicePage from './pages/ReinscriptionServicePage'
import OuvertureCaissePage from './pages/OuvertureCaissePage'
import NouveauPaiementPage from './pages/NouveauPaiementPage'
import FermetureCaissePage from './pages/FermetureCaissePage'
import PointCaissePage from './pages/PointCaissePage'
import EtatPaiementsPage from './pages/EtatPaiementsPage'
import EtatPaiementsPeriodiquesPage from './pages/EtatPaiementsPeriodiquesPage'
import EtatPaiementsCumulesPage from './pages/EtatPaiementsCumulesPage'
import Configuration from './pages/Configuration'
import ConfigLayout from './pages/ConfigLayout'
import AffectationClasses from './pages/AffectationClasses'
import Sms from './pages/Sms'
import Mail from './pages/Mail'
import Caisses from './pages/Caisses'
import Cycles from './pages/Cycles'
import Niveaux from './pages/Niveaux'
import ClassesPage from './pages/ClassesPage'
import AcademicYears from './pages/AcademicYears'
import SuperDashboard from './pages/super/SuperDashboard'
import Schools from './pages/super/Schools'
import Plans from './pages/super/Plans'
import Subscriptions from './pages/super/Subscriptions'
import AuditLog from './pages/super/AuditLog'
import Affectations from './pages/super/Affectations'
import Societes from './pages/super/Societes'
import Users from './pages/super/Users'
import Applications from './pages/super/Applications'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Console Super Administrateur */}
      <Route
        path="/super"
        element={
          <ProtectedRoute superAdmin>
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperDashboard />} />
        <Route path="ecoles" element={<Schools />} />
        <Route path="abonnements" element={<Subscriptions />} />
        <Route path="formules" element={<Plans />} />
        <Route path="societes" element={<Societes />} />
        <Route path="utilisateurs" element={<Users />} />
        <Route path="applications" element={<Applications />} />
        <Route path="affectations" element={<Affectations />} />
        <Route path="audit" element={<AuditLog />} />
      </Route>

      {/* Espace Établissement */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/annees" element={<AcademicYears />} />
        <Route path="/structure" element={<Structure />} />
        <Route path="/grille-scolarite" element={<GrilleScolarite />} />
        <Route path="/eleves/nouveau" element={<StudentForm />} />
        <Route path="/eleves/:matricule/modifier" element={<StudentForm />} />
        <Route path="/factures" element={<Invoices />} />
        <Route path="/paiements" element={<Payments />} />
        <Route path="/depenses" element={<Expenses />} />
        <Route path="/fournisseurs" element={<Suppliers />} />
        <Route path="/tresorerie" element={<Treasury />} />
        <Route path="/salaires" element={<Salaries />} />
        <Route path="/rapports" element={<Reports />} />
        <Route path="/utilisateurs" element={<EstablishmentUsers />} />
        <Route path="/activite" element={<Activity />} />
<Route path="/configuration" element={<ConfigLayout />}>
  <Route index element={<Configuration />} />
  <Route path="annees" element={<AcademicYears />} />
  <Route path="cycles" element={<Cycles />} />
  <Route path="niveaux" element={<Niveaux />} />
  <Route path="classes" element={<ClassesPage />} />
  <Route path="affectation" element={<AffectationClasses />} />
  <Route path="grille-scolarite" element={<GrilleScolarite />} />
  <Route path="caisses" element={<Caisses />} />
  <Route path="sms" element={<Sms />} />
<Route path="mail" element={<Mail />} />
  <Route path="utilisateurs" element={<EstablishmentUsers />} />
</Route>
        <Route path="/fichier-base" element={<FichierBaseLayout />}>
          <Route path="bus" element={<BusPage />} />
          <Route path="chauffeurs" element={<ChauffeursPage />} />
          <Route path="destinations" element={<DestinationsPage />} />
          <Route path="grille-scolarite" element={<GrilleScolarite />} />
          <Route path="grille-transport" element={<GrilleTransport />} />
          <Route path="grille-cantine" element={<GrilleCantine />} />
          <Route path="grille-pension" element={<GrillePension />} />
        </Route>
        <Route path="/traitement" element={<TraitementLayout />}>
          <Route path="inscription" element={<Students />} />
          <Route path="remise" element={<RemisePage />} />
          <Route path="transport" element={<TransportElevePage />} />
          <Route path="chauffeur-car" element={<ChauffeurCarPage />} />
          <Route path="reinscription-transport" element={<ReinscriptionTransportPage />} />
          <Route path="changement-destination" element={<ChangementDestinationPage />} />
          <Route path="historique-transport" element={<HistoriquePaiementTransportPage />} />
          <Route path="eleves-destination" element={<ElevesParDestinationPage />} />
          <Route path="eleves-car" element={<ElevesParCarPage />} />
          <Route path="inscription-cantine" element={<InscriptionServicePage base="/cantine" label="Cantine" />} />
          <Route path="reinscription-cantine" element={<ReinscriptionServicePage base="/cantine" label="Cantine" />} />
          <Route path="inscription-pension" element={<InscriptionServicePage base="/pension" label="Pension" />} />
          <Route path="reinscription-pension" element={<ReinscriptionServicePage base="/pension" label="Pension" />} />
          <Route path="ouverture-caisse" element={<OuvertureCaissePage />} />
          <Route path="nouveau-paiement" element={<NouveauPaiementPage />} />
          <Route path="fermeture-caisse" element={<FermetureCaissePage />} />
          <Route path="point-caisse" element={<PointCaissePage />} />
          <Route path="etat-paiements" element={<EtatPaiementsPage />} />
          <Route path="etat-paiements-periodiques" element={<EtatPaiementsPeriodiquesPage />} />
          <Route path="etat-paiements-cumules" element={<EtatPaiementsCumulesPage />} />
        </Route>
        <Route path="/parametres" element={<Settings />} />
      </Route>
    </Routes>
  )
}
