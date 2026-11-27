import { Badge } from "@/components/ui/badge";

export default function PatientAllergies({ allergies }: { allergies: string[] | null }) {
  if (!allergies?.length) return null;
  return <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Alergias del paciente">
    {allergies.map((tag) => <Badge key={tag} variant="outline" className="allergy-badge max-w-full whitespace-normal break-words rounded-lg">{tag}</Badge>)}
  </div>;
}