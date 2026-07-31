"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as Icons from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EXPENSE_GROUPS = [
  { key: "essential", label: "Essentials", accent: "text-amber-300" },
  { key: "savings", label: "Savings", accent: "text-primary" },
  { key: "personal", label: "Personal", accent: "text-emerald-300" },
];

const PLANNER_TABLES = {
  cards: "financial_planner_cards",
  income: "financial_planner_income",
  deductions: "financial_planner_deductions",
  expenses: "financial_planner_expenses",
  installments: "financial_planner_installments",
  incomeActuals: "financial_planner_income_actuals",
  deductionActuals: "financial_planner_deduction_actuals",
};

const plannerItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  value: z.coerce.number().nonnegative("Value must be 0 or more."),
  notes: z.string().optional(),
  type: z.string().default("essential"),
  icon: z.string().default("HelpCircle"),
  card: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function formatCurrency(value) {
  return `฿${Number(value || 0).toLocaleString()}`;
}

function getExpenseIcon(iconName) {
  const Icon = Icons[iconName] || Icons.HelpCircle;
  return <Icon size={16} />;
}

function createClientId() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now());
}

function isMissingTableError(error) {
  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.message?.includes("relation") ||
    error?.message?.includes("does not exist")
  );
}

function throwIfSupabaseError(error) {
  if (error) throw error;
}

function monthToDate(monthValue) {
  return `${monthValue || new Date().toISOString().slice(0, 7)}-01`;
}

function dateToMonth(dateValue) {
  return String(dateValue || "").slice(0, 7);
}

function getInitialPlannerData() {
  return {
    cards: [],
    years: {
      [new Date().getFullYear().toString()]: {
        income: [],
        deductions: [],
        expenses: [],
        installments: [],
      },
    },
  };
}

function getPlannerYear(data, year) {
  if (!data.years[year]) {
    data.years[year] = { income: [], deductions: [], expenses: [], installments: [] };
  }

  return data.years[year];
}

function numberFromDb(value) {
  return Number(value || 0);
}

function collectActuals(actualRows, idColumn, itemId) {
  return actualRows
    .filter((row) => row[idColumn] === itemId)
    .reduce((actual, row) => {
      actual[MONTHS[row.planner_month - 1]] = numberFromDb(row.amount);
      return actual;
    }, {});
}

async function loadPlannerData(supabase, userId) {
  const [
    cardsResult,
    incomeResult,
    deductionsResult,
    expensesResult,
    installmentsResult,
    incomeActualsResult,
    deductionActualsResult,
  ] =
    await Promise.all([
      supabase.from(PLANNER_TABLES.cards).select("id,name,color").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.income).select("id,planner_year,name,notes,monthly").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.deductions).select("id,planner_year,name,notes,monthly").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.expenses).select("id,planner_year,name,notes,amount,expense_type,icon").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.installments).select("id,planner_year,card_id,name,notes,monthly,start_month,end_month").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.incomeActuals).select("income_id,planner_year,planner_month,amount").eq("user_id", userId),
      supabase.from(PLANNER_TABLES.deductionActuals).select("deduction_id,planner_year,planner_month,amount").eq("user_id", userId),
    ]);

  const results = [
    cardsResult,
    incomeResult,
    deductionsResult,
    expensesResult,
    installmentsResult,
    incomeActualsResult,
    deductionActualsResult,
  ];
  const missingTable = results.find((result) => isMissingTableError(result.error));
  if (missingTable) {
    throw new Error("table-not-found");
  }

  results.forEach((result) => throwIfSupabaseError(result.error));

  const plannerData = getInitialPlannerData();
  const incomeActualRows = incomeActualsResult.data || [];
  const deductionActualRows = deductionActualsResult.data || [];
  const cards = cardsResult.data || [];
  const cardNameById = new Map(cards.map((card) => [card.id, card.name]));

  plannerData.cards = cards.map((card) => ({
    id: card.id,
    name: card.name,
    color: card.color,
  }));

  for (const row of incomeResult.data || []) {
    const yearData = getPlannerYear(plannerData, String(row.planner_year));
    yearData.income.push({
      id: row.id,
      name: row.name,
      notes: row.notes,
      monthly: numberFromDb(row.monthly),
      actual: collectActuals(incomeActualRows, "income_id", row.id),
    });
  }

  for (const row of deductionsResult.data || []) {
    const yearData = getPlannerYear(plannerData, String(row.planner_year));
    yearData.deductions.push({
      id: row.id,
      name: row.name,
      notes: row.notes,
      monthly: numberFromDb(row.monthly),
      actual: collectActuals(deductionActualRows, "deduction_id", row.id),
    });
  }

  for (const row of expensesResult.data || []) {
    const yearData = getPlannerYear(plannerData, String(row.planner_year));
    yearData.expenses.push({
      id: row.id,
      name: row.name,
      notes: row.notes,
      amount: numberFromDb(row.amount),
      type: row.expense_type,
      icon: row.icon,
    });
  }

  for (const row of installmentsResult.data || []) {
    const yearData = getPlannerYear(plannerData, String(row.planner_year));
    yearData.installments.push({
      id: row.id,
      name: row.name,
      notes: row.notes,
      monthly: numberFromDb(row.monthly),
      startDate: dateToMonth(row.start_month),
      endDate: dateToMonth(row.end_month),
      card: cardNameById.get(row.card_id) || "",
    });
  }

  return plannerData;
}

function rowsForSave(userId, data) {
  const now = new Date().toISOString();
  const cardIdByName = new Map(data.cards.map((card) => [card.name, card.id]));
  const rows = {
    cards: data.cards.map((card) => ({
      user_id: userId,
      id: card.id,
      name: card.name,
      color: card.color || "#65d9f2",
      updated_at: now,
    })),
    income: [],
    deductions: [],
    expenses: [],
    installments: [],
    incomeActuals: [],
    deductionActuals: [],
  };

  for (const [year, yearData] of Object.entries(data.years)) {
    const plannerYear = Number(year);

    for (const item of yearData.income || []) {
      rows.income.push({
        user_id: userId,
        id: item.id,
        planner_year: plannerYear,
        name: item.name,
        notes: item.notes || "",
        monthly: Number(item.monthly || 0),
        updated_at: now,
      });

      for (const [month, amount] of Object.entries(item.actual || {})) {
        rows.incomeActuals.push({
          user_id: userId,
          income_id: item.id,
          planner_year: plannerYear,
          planner_month: MONTHS.indexOf(month) + 1,
          amount: Number(amount || 0),
          updated_at: now,
        });
      }
    }

    for (const item of yearData.deductions || []) {
      rows.deductions.push({
        user_id: userId,
        id: item.id,
        planner_year: plannerYear,
        name: item.name,
        notes: item.notes || "",
        monthly: Number(item.monthly || 0),
        updated_at: now,
      });

      for (const [month, amount] of Object.entries(item.actual || {})) {
        rows.deductionActuals.push({
          user_id: userId,
          deduction_id: item.id,
          planner_year: plannerYear,
          planner_month: MONTHS.indexOf(month) + 1,
          amount: Number(amount || 0),
          updated_at: now,
        });
      }
    }

    for (const item of yearData.expenses || []) {
      rows.expenses.push({
        user_id: userId,
        id: item.id,
        planner_year: plannerYear,
        name: item.name,
        notes: item.notes || "",
        amount: Number(item.amount || 0),
        expense_type: item.type || "essential",
        icon: item.icon || "HelpCircle",
        updated_at: now,
      });
    }

    for (const item of yearData.installments || []) {
      const cardId = cardIdByName.get(item.card);
      if (!cardId) continue;

      rows.installments.push({
        user_id: userId,
        id: item.id,
        planner_year: plannerYear,
        card_id: cardId,
        name: item.name,
        notes: item.notes || "",
        monthly: Number(item.monthly || 0),
        start_month: monthToDate(item.startDate),
        end_month: monthToDate(item.endDate),
        updated_at: now,
      });
    }
  }

  rows.incomeActuals = rows.incomeActuals.filter((row) => row.planner_month >= 1);
  rows.deductionActuals = rows.deductionActuals.filter((row) => row.planner_month >= 1);
  return rows;
}

async function deleteUserRows(supabase, tableName, userId) {
  throwIfSupabaseError((await supabase.from(tableName).delete().eq("user_id", userId)).error);
}

async function insertRows(supabase, tableName, rows) {
  if (rows.length > 0) {
    throwIfSupabaseError((await supabase.from(tableName).insert(rows)).error);
  }
}

async function savePlannerData(supabase, userId, data) {
  const rows = rowsForSave(userId, data);

  // ponytail: full replacement keeps the UI state model small; upgrade to per-row mutations or an RPC transaction if concurrent editing appears.
  await deleteUserRows(supabase, PLANNER_TABLES.incomeActuals, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.deductionActuals, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.installments, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.expenses, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.deductions, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.income, userId);
  await deleteUserRows(supabase, PLANNER_TABLES.cards, userId);

  await insertRows(supabase, PLANNER_TABLES.cards, rows.cards);
  await insertRows(supabase, PLANNER_TABLES.income, rows.income);
  await insertRows(supabase, PLANNER_TABLES.deductions, rows.deductions);
  await insertRows(supabase, PLANNER_TABLES.expenses, rows.expenses);
  await insertRows(supabase, PLANNER_TABLES.installments, rows.installments);
  await insertRows(supabase, PLANNER_TABLES.incomeActuals, rows.incomeActuals);
  await insertRows(supabase, PLANNER_TABLES.deductionActuals, rows.deductionActuals);
}

export default function FinancialPlannerTool() {
  const [activeTab, setActiveTab] = useState("installments");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [user, setUser] = useState(null);
  const [savingState, setSavingState] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [formActual, setFormActual] = useState({});

  const [supabase] = useState(() => createSupabaseBrowserClient());
  const itemForm = useForm({
    resolver: zodResolver(plannerItemSchema),
    defaultValues: {
      name: "",
      value: 0,
      notes: "",
      type: "essential",
      icon: "HelpCircle",
      card: "",
      startDate: "",
      endDate: "",
    },
  });

  const markPaymentPaid = (item) => {
    const updated = { ...data };
    const yearData = updated.years[selectedYear];
    
    yearData.installments = yearData.installments.map(i => 
      i.id === item.id ? { ...i, paid: Math.min(Number(i.paid) + 1, 12) } : i
    );
    
    saveToSupabase(updated);
  };

  useEffect(() => {
    async function loadFinancialData() {
      try {
        setLoading(true);

        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          setDbError("You must be logged in to view your financial planner.");
          setLoading(false);
          return;
        }

        setUser(currentUser);

        setData(await loadPlannerData(supabase, currentUser.id));
      } catch (err) {
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        setDbError(message === "table-not-found" ? "table-not-found" : `Database error: ${message}`);
      } finally {
        setLoading(false);
      }
    }

    loadFinancialData();
  }, [supabase]);

  const saveToSupabase = async (newData) => {
    if (!user) return;

    setSavingState("saving");
    setData(newData);

    try {
      await savePlannerData(supabase, user.id, newData);

      setSavingState("saved");
      setTimeout(() => setSavingState(""), 2000);
    } catch (e) {
      setSavingState("error");
      setTimeout(() => setSavingState(""), 3000);
      alert(`Failed to sync data to Supabase: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
  };

  const getMonthlyValue = (item) => {
    if (item.actual && item.actual[selectedMonth] !== undefined) {
      return Number(item.actual[selectedMonth]);
    }
    return Number(item.monthly || 0);
  };

  const handleDeleteItem = (type, id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const updated = { ...data };
    const yearData = updated.years[selectedYear];

    if (type === "income") yearData.income = yearData.income.filter((item) => item.id !== id);
    if (type === "deduction") yearData.deductions = yearData.deductions.filter((item) => item.id !== id);
    if (type === "expense") yearData.expenses = yearData.expenses.filter((item) => item.id !== id);
    if (type === "installment") yearData.installments = yearData.installments.filter((item) => item.id !== id);

    saveToSupabase(updated);
  };

  const handleSaveForm = (values) => {
    if (modalType === "installment") {
      if (!values.card) {
        itemForm.setError("card", { message: "Card is required." });
        return;
      }
      if (!values.startDate) {
        itemForm.setError("startDate", { message: "Start date is required." });
        return;
      }
      if (!values.endDate) {
        itemForm.setError("endDate", { message: "End date is required." });
        return;
      }
    }

    const updated = { ...data };
    const yearData = updated.years[selectedYear];
    
    const payload = {
      id: editItem ? editItem.id : createClientId(),
      name: values.name,
      notes: values.notes || "",
    };

    if (modalType === "income" || modalType === "deduction") {
      payload.monthly = values.value;
      payload.actual = formActual;
    } else if (modalType === "expense") {
      payload.amount = values.value;
      payload.type = values.type;
      payload.icon = values.icon;
    } else if (modalType === "installment") {
      payload.monthly = values.value;
      payload.startDate = values.startDate;
      payload.endDate = values.endDate;
      payload.card = values.card;
    }

    const targetKey =
      modalType === "income"
        ? "income"
        : modalType === "deduction"
          ? "deductions"
          : modalType === "expense"
            ? "expenses"
            : "installments";

    if (editItem) {
      yearData[targetKey] = yearData[targetKey].map((item) =>
        item.id === editItem.id ? payload : item,
      );
    } else {
      yearData[targetKey].push(payload);
    }

    saveToSupabase(updated);
    setModalOpen(false);
  };

  const handleOpenAddModal = (type) => {
    setModalType(type);
    setEditItem(null);
    itemForm.reset({
      name: "",
      value: 0,
      notes: "",
      type: "essential",
      icon: "HelpCircle",
      card: data?.cards[0]?.name || "",
      startDate: "",
      endDate: "",
    });
    setFormActual({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (type, item) => {
    setModalType(type);
    setEditItem(item);
    itemForm.reset({
      name: item.name,
      value: type === "expense" ? item.amount : item.monthly,
      notes: item.notes || "",
      type: item.type || "essential",
      icon: item.icon || "HelpCircle",
      card: item.card || data?.cards[0]?.name || "",
      startDate: item.startDate || new Date().toISOString().slice(0, 7),
      endDate: item.endDate || new Date().toISOString().slice(0, 7),
    });
    setFormActual(item.actual || {});
    setModalOpen(true);
  };

  if (dbError) return <Alert variant="destructive">{dbError}</Alert>;
  if (loading || !data) return <Card className="p-5 text-sm text-muted-foreground">Loading planner...</Card>;

  const yearData = data?.years?.[selectedYear] || { income: [], deductions: [], expenses: [], installments: [] };
  const totalIncome = yearData.income.reduce((acc, item) => acc + getMonthlyValue(item), 0);
  const totalDeductions = yearData.deductions.reduce((acc, item) => acc + getMonthlyValue(item), 0);
  const takeHomeIncome = totalIncome - totalDeductions;
  const totalExpenses = yearData.expenses.reduce((acc, item) => acc + Number(item.amount || 0), 0);
  const totalInstallments = yearData.installments.reduce((acc, item) => acc + Number(item.monthly || 0), 0);
  const totalPlannedSpending = totalExpenses + totalInstallments;
  const netFlow = takeHomeIncome - totalPlannedSpending;
  const spendingByType = EXPENSE_GROUPS.map((group) => {
    const items = yearData.expenses.filter((item) => item.type === group.key);
    const total = items.reduce((acc, item) => acc + Number(item.amount || 0), 0);
    return { ...group, items, total };
  });

  const getCardInstallmentTotal = (cardName) => {
    return yearData.installments
      .filter((item) => item.card === cardName)
      .reduce((acc, item) => acc + Number(item.monthly || 0), 0);
  };

  const getInstallmentRemainingBalance = (item) => {
    if (Number(item.total) > 0) {
      return Math.max(Number(item.total) - Number(item.monthly || 0) * Number(item.paid || 0), 0);
    }
    return Math.max((12 - Number(item.paid || 0)) * Number(item.monthly || 0), 0);
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["Take home", takeHomeIncome],
          ["Planned spending", totalPlannedSpending],
          ["Installments", totalInstallments],
          ["Net flow", netFlow],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-max rounded-md border border-border bg-card p-1">
          {["installments", "settings"].map((tab) => (
            <Button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              variant={activeTab === tab ? "default" : "ghost"}
              size="sm"
              className="capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>
        <Badge variant={savingState === "error" ? "destructive" : savingState ? "success" : "secondary"}>
          {savingState || "idle"}
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {Object.keys(data.years).map((year) => (
          <Button
            key={year}
            type="button"
            onClick={() => setSelectedYear(year)}
            variant={selectedYear === year ? "default" : "outline"}
            size="sm"
          >
            {year}
          </Button>
        ))}
      </div>

      {activeTab === "installments" ? (
        <section className="space-y-6">
             <Button type="button" onClick={() => handleOpenAddModal("installment")}>
                <Icons.Plus size={16} /> Add installment
             </Button>
             <div className="grid gap-3 md:grid-cols-3">
              {spendingByType.map((group) => (
                <Card key={group.key}>
                  <CardContent className="p-4">
                    <p className={cn("text-sm font-medium", group.accent)}>{group.label}</p>
                    <p className="mt-2 text-xl font-semibold">{formatCurrency(group.total)}</p>
                  </CardContent>
                </Card>
              ))}
             </div>
             {data.cards.map(card => (
                 <Card key={card.id}>
                   <CardHeader className="flex-row items-center justify-between">
                     <CardTitle className="flex items-center gap-2">
                         <div className="h-3 w-3 rounded-full" style={{ backgroundColor: card.color }} />
                         {card.name}
                     </CardTitle>
                     <Badge variant="secondary">{formatCurrency(getCardInstallmentTotal(card.name))}</Badge>
                   </CardHeader>
                   <CardContent className="space-y-2">
                     {yearData.installments.filter(i => i.card === card.name).map(item => {
                         const currentYM = `${selectedYear}-${(MONTHS.indexOf(selectedMonth) + 1).toString().padStart(2, '0')}`;
                         const isActive = item.startDate <= currentYM && item.endDate >= currentYM;
                         if(!isActive) return null;
                         return (
                         <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
                             <div>
                                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.startDate} to {item.endDate} · {formatCurrency(getInstallmentRemainingBalance(item))} remaining
                                </p>
                             </div>
                             <div className="flex gap-2">
                                 <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenEditModal("installment", item)}>
                                    <Icons.Edit3 size={16} />
                                 </Button>
                                 <Button type="button" variant="ghost" size="icon" className="hover:text-red-300" onClick={() => handleDeleteItem("installment", item.id)}>
                                    <Icons.Trash2 size={16} />
                                 </Button>
                             </div>
                         </div>
                     )})}
                   </CardContent>
                 </Card>
             ))}
        </section>
      ) : (
        <div className="space-y-6">
             <Card>
              <CardHeader>
                <CardTitle>Credit cards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                    {data.cards.map(card => (
                        <div key={card.id} className="flex items-center justify-between rounded-md border border-border bg-background p-3">
                            <span className="font-semibold text-foreground">{card.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="hover:text-red-300" onClick={() => {
                                if (confirm("Are you sure?")) {
                                    const updated = { ...data, cards: data.cards.filter(c => c.id !== card.id) };
                                    saveToSupabase(updated);
                                }
                            }}>
                                <Icons.Trash2 size={16} />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button type="button" variant="secondary" className="mt-4" onClick={() => {
                    const name = prompt("Enter card name:");
                    if(name) {
                        const updated = { ...data, cards: [...data.cards, { id: createClientId(), name, color: "#65d9f2" }] };
                        saveToSupabase(updated);
                    }
                }}>
                    <Icons.Plus size={16} /> Add card
                </Button>
              </CardContent>
             </Card>
        </div>
      )}
      
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{editItem ? "Edit" : "Add"} {modalType}</DialogTitle>
          </DialogHeader>
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit(handleSaveForm)} className="space-y-4">
              <FormItem>
                <FormLabel htmlFor="planner-name">Name</FormLabel>
                <FormControl>
                  <Input id="planner-name" {...itemForm.register("name")} />
                </FormControl>
                <FormMessage name="name" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="planner-value">Monthly value</FormLabel>
                <FormControl>
                  <Input id="planner-value" type="number" step="any" {...itemForm.register("value")} />
                </FormControl>
                <FormMessage name="value" />
              </FormItem>

              {modalType === "installment" ? (
                <>
                  <FormItem>
                    <FormLabel htmlFor="planner-start">Start date</FormLabel>
                    <FormControl>
                      <Input id="planner-start" type="month" {...itemForm.register("startDate")} />
                    </FormControl>
                    <FormMessage name="startDate" />
                  </FormItem>
                  <FormItem>
                    <FormLabel htmlFor="planner-end">End date</FormLabel>
                    <FormControl>
                      <Input id="planner-end" type="month" {...itemForm.register("endDate")} />
                    </FormControl>
                    <FormMessage name="endDate" />
                  </FormItem>
                  <FormField
                    control={itemForm.control}
                    name="card"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card</FormLabel>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select card" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {data.cards.map((card) => (
                              <SelectItem key={card.id} value={card.name}>{card.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage name="card" />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              <div className="flex gap-3">
                <Button type="submit" className="flex-1">Save</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
