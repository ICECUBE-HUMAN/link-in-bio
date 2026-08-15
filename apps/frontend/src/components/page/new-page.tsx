import { useState } from "react";
import { CreatePageFlow } from "@/components/page/create-page-flow";
import { PageCreationSuccess } from "@/components/page/page-creation-success";

export function NewPage() {
	const [createdHandle, setCreatedHandle] = useState<string | null>(null);

	return createdHandle ? (
		<PageCreationSuccess handle={createdHandle} />
	) : (
		<CreatePageFlow onCreated={setCreatedHandle} />
	);
}
