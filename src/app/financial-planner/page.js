import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import FinancialPlannerTool from "@/components/financial-planner-tool";
import PageHeader from "@/components/page-header";

export const metadata = {
  title: "Financial Planner | Rootspace",
  description: "Personal budget and installment tracker.",
};

export default async function FinancialPlannerPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/financial-planner");
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="rootspace / financial-planner"
        title="Money management"
        description={`Monthly cash flow and credit card installments synced with your ${new Date().getFullYear()} financial strategy.`}
      />

      <FinancialPlannerTool />
    </div>
  );
}
