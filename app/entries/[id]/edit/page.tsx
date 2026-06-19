import { redirect } from "next/navigation";

export default async function LegacyEditEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/entries/${id}`);
}
