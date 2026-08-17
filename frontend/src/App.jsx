import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import RequireRole from './components/RequireRole'
import RequireModule from './components/RequireModule'
import DashboardLayout from './layouts/DashboardLayout'
import SuperAdminLayout from './layouts/SuperAdminLayout'
import AdminEtablissementLayout from './layouts/AdminEtablissementLayout'
import Login from './pages/Login'

// Layouts internes (légers) : chargés en différé aussi mais rapides.
const FichierBaseLayout = lazy(() => import('./pages/FichierBaseLayout'))
const TraitementLayout = lazy(() => import('./pages/TraitementLayout'))
const ConfigLayout = lazy(() => import('./pages/ConfigLayout'))

// Pages — chargées à la demande (code splitting) pour accélérer l'ouverture.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Students = lazy(() => import('./pages/Students'))
const StudentForm = lazy(() => import('./pages/StudentForm'))
const EstablishmentUsers = lazy(() => import('./pages/EstablishmentUsers'))
const Activity = lazy(() => import('./pages/Activity'))
const Expenses = lazy(() => import('./pages/Expenses'))
const Settings = lazy(() => import('./pages/Settings'))
const Structure = lazy(() => import('./pages/Structure'))
const GrilleScolarite = lazy(() => import('./pages/GrilleScolarite'))
const BusPage = lazy(() => import('./pages/BusPage'))
const ChauffeursPage = lazy(() => import('./pages/ChauffeursPage'))
const DestinationsPage = lazy(() => import('./pages/DestinationsPage'))
const GrilleTransport = lazy(() => import('./pages/GrilleTransport'))
const GrilleCantine = lazy(() => import('./pages/GrilleCantine'))
const GrillePension = lazy(() => import('./pages/GrillePension'))
const RemisePage = lazy(() => import('./pages/RemisePage'))
const TransportElevePage = lazy(() => import('./pages/TransportElevePage'))
const ChauffeurCarPage = lazy(() => import('./pages/ChauffeurCarPage'))
const ReinscriptionTransportPage = lazy(() => import('./pages/ReinscriptionTransportPage'))
const ChangementDestinationPage = lazy(() => import('./pages/ChangementDestinationPage'))
const HistoriquePaiementTransportPage = lazy(() => import('./pages/HistoriquePaiementTransportPage'))
const ElevesParDestinationPage = lazy(() => import('./pages/ElevesParDestinationPage'))
const ElevesParCarPage = lazy(() => import('./pages/ElevesParCarPage'))
const InscriptionServicePage = lazy(() => import('./pages/InscriptionServicePage'))
const ReinscriptionServicePage = lazy(() => import('./pages/ReinscriptionServicePage'))
const OuvertureCaissePage = lazy(() => import('./pages/OuvertureCaissePage'))
const NouveauPaiementPage = lazy(() => import('./pages/NouveauPaiementPage'))
const FermetureCaissePage = lazy(() => import('./pages/FermetureCaissePage'))
const PointCaissePage = lazy(() => import('./pages/PointCaissePage'))
const PointCaisseDetaillePage = lazy(() => import('./pages/PointCaisseDetaillePage'))
const ChiffreAffairePage = lazy(() => import('./pages/ChiffreAffairePage'))
const EtatPaiementsPage = lazy(() => import('./pages/EtatPaiementsPage'))
const EtatPaiementsPeriodiquesPage = lazy(() => import('./pages/EtatPaiementsPeriodiquesPage'))
const EtatPaiementsCumulesPage = lazy(() => import('./pages/EtatPaiementsCumulesPage'))
const ReceptionDossiers = lazy(() => import('./pages/ReceptionDossiers'))
const ConsultationPaiementsDossiers = lazy(() => import('./pages/ConsultationPaiementsDossiers'))
const PaiementsPrevisionnelsEtat = lazy(() => import('./pages/PaiementsPrevisionnelsEtat'))
const Depart = lazy(() => import('./pages/Depart'))
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'))
const Configuration = lazy(() => import('./pages/Configuration'))
const ConfigDossiersFraisAnnexes = lazy(() => import('./pages/ConfigDossiersFraisAnnexes'))
const OutilEleves = lazy(() => import('./pages/OutilEleves'))
const AffectationClasses = lazy(() => import('./pages/AffectationClasses'))
const Sms = lazy(() => import('./pages/Sms'))
const Mail = lazy(() => import('./pages/Mail'))
const Caisses = lazy(() => import('./pages/Caisses'))
const Cycles = lazy(() => import('./pages/Cycles'))
const Niveaux = lazy(() => import('./pages/Niveaux'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const AcademicYears = lazy(() => import('./pages/AcademicYears'))
const SuperDashboard = lazy(() => import('./pages/super/SuperDashboard'))
const Schools = lazy(() => import('./pages/super/Schools'))
const Plans = lazy(() => import('./pages/super/Plans'))
const Subscriptions = lazy(() => import('./pages/super/Subscriptions'))
const AuditLog = lazy(() => import('./pages/super/AuditLog'))
const Affectations = lazy(() => import('./pages/super/Affectations'))
const AffectationsEtab = lazy(() => import('./pages/super/AffectationsEtab'))
const Societes = lazy(() => import('./pages/super/Societes'))
const Users = lazy(() => import('./pages/super/Users'))
const Applications = lazy(() => import('./pages/super/Applications'))
const FacturationPage = lazy(() => import('./pages/super/FacturationPage'))
const ParametresPage = lazy(() => import('./pages/super/ParametresPage'))
const AdminEtabUtilisateurs = lazy(() => import('./pages/admin-etablissement/UtilisateursPage'))
const AdminEtabParametres = lazy(() => import('./pages/admin-etablissement/ParametresPage'))
const AdminEtabRapports = lazy(() => import('./pages/admin-etablissement/RapportsPage'))
const AdminEtabAbonnement = lazy(() => import('./pages/admin-etablissement/AbonnementPage'))
const AdminEtabHome = lazy(() => import('./pages/admin-etablissement/Home'))

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#5c6b82', fontFamily: "'DM Sans',sans-serif", fontSize: 14 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #E5FFF7', borderTopColor: '#00CC8E', animation: 'econ-spin 0.8s linear infinite', marginRight: 10 }} />
      Chargement…
      <style>{'@keyframes econ-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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
          <Route path="affectations-etab" element={<AffectationsEtab />} />
          <Route path="facturation" element={<FacturationPage />} />
          <Route path="parametres" element={<ParametresPage />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>

        {/* Console Admin d'établissement */}
        <Route
          path="/admin-etablissement"
          element={
            <ProtectedRoute>
              <RequireRole role="admin_etablissement">
                <AdminEtablissementLayout />
              </RequireRole>
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminEtabHome />} />
          <Route path="utilisateurs" element={<RequireModule module="gestion_utilisateurs"><AdminEtabUtilisateurs /></RequireModule>} />
          <Route path="parametres" element={<RequireModule module="parametres_etablissement"><AdminEtabParametres /></RequireModule>} />
          <Route path="rapports" element={<RequireModule module="rapports_transversaux"><AdminEtabRapports /></RequireModule>} />
          <Route path="abonnement" element={<RequireModule module="abonnement_facturation"><AdminEtabAbonnement /></RequireModule>} />
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
          <Route path="/depenses" element={<Expenses />} />
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
            <Route path="dossiers-frais" element={<ConfigDossiersFraisAnnexes />} />
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
            <Route path="point-caisse-detaille" element={<PointCaisseDetaillePage />} />
            <Route path="chiffre-affaire" element={<ChiffreAffairePage />} />
            <Route path="etat-paiements" element={<EtatPaiementsPage />} />
            <Route path="etat-paiements-periodiques" element={<EtatPaiementsPeriodiquesPage />} />
            <Route path="etat-paiements-cumules" element={<EtatPaiementsCumulesPage />} />
            <Route path="reception-dossiers" element={<ReceptionDossiers />} />
            <Route path="consultation-dossiers" element={<ConsultationPaiementsDossiers />} />
            <Route path="previsionnels-etat" element={<PaiementsPrevisionnelsEtat />} />
            <Route path="depart" element={<Depart />} />
            <Route path="communication" element={<CommunicationPage />} />
          </Route>
          <Route path="/outil/eleves" element={<OutilEleves />} />
          <Route path="/parametres" element={<Settings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
