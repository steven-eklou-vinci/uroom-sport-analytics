import Card from '../../components/ui/Card';

export default function Privacy() {
  return (
    <section className="w-full bg-white py-16 px-4 flex flex-col items-center min-h-[60vh]">
      <Card className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 uppercase tracking-tight text-center">Politique de confidentialité</h1>
        <p className="text-dark text-lg">Nous respectons la vie privée de nos utilisateurs. Les données collectées sont utilisées uniquement pour le fonctionnement de la plateforme et ne sont jamais revendues.</p>
      </Card>
    </section>
  );
}
