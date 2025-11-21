import Card from '../../components/ui/Card';

export default function Terms() {
  return (
    <section className="w-full bg-white py-16 px-4 flex flex-col items-center min-h-[60vh]">
      <Card className="w-full max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-6 uppercase tracking-tight text-center">Conditions Générales d’Utilisation</h1>
        <p className="text-dark text-lg">L’utilisation de la plateforme implique l’acceptation des présentes conditions. Pour toute question, contactez notre équipe.</p>
      </Card>
    </section>
  );
}
