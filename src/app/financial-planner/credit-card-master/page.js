import { redirect } from "next/navigation";
import CreditCardMaster from "@/components/credit-card-master";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = {
	title: "Credit Card Master | Rootspace",
	description: "Manage credit card installment planning.",
};

export const dynamic = "force-dynamic";

export default async function CreditCardMasterPage() {
	if (!(await getCurrentUser())) {
		redirect("/login?next=/financial-planner/credit-card-master");
	}
	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				eyebrow="rootspace / financial-planner / cards"
				title="Credit Card Master"
				description="Manage the cards used by your installment plans."
			/>
			<CreditCardMaster />
		</div>
	);
}
