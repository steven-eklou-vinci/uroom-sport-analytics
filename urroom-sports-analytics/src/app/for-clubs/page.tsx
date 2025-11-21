import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function ForClubs() {
  return (
    <section className="w-full bg-light py-16 px-4 flex flex-col items-center min-h-[60vh]">
      <Card className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 uppercase tracking-tight text-center">Pour les clubs</h1>
        <ul className="list-disc ml-6 space-y-2 text-dark text-lg">
          <li>Recherche multi-critères (âge, poste, nation, métriques…)</li>
          <li>Création de shortlists privées</li>
          <li>Export PDF, partage de rapports</li>
          <li>Bouton “Request Trial” pour contacter un joueur</li>
        </ul>
        <div className="flex justify-center mt-8">
          <Button>
            Demander une démo
          </Button>
        </div>
      </Card>
    </section>
  );
}
