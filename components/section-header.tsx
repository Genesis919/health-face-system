export function SectionHeader({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-4xl font-black">{title}</h1>
      <p className="mt-3 text-lg leading-8 text-stone-600">{description}</p>
    </div>
  );
}
