import { redirect } from "next/navigation";
import DashboardTool from "@/components/financial-planner-dashboard";
import PageHeader from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata = {
	title: "Dashboard | Financial Planner",
	description: "Monthly installment dashboard.",
};
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	if (!(await getCurrentUser())) {
		redirect("/login?next=/financial-planner/dashboard");
	}
	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				eyebrow="rootspace / financial-planner / dashboard"
				title="Dashboard"
				description="See what you need to pay this month, grouped by credit card."
			/>
			<DashboardTool />
		</div>
	);
}
