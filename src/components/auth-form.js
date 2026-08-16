"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signIn } from "@/app/auth/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const signInSchema = z.object({
	email: z.email("Enter a valid email address.").transform((value) => value.trim().toLowerCase()),
	password: z.string().min(6, "Password must be at least 6 characters."),
});

export default function AuthForm() {
	const [serverMessage, setServerMessage] = useState(null);
	const form = useForm({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	async function onSubmit(values) {
		setServerMessage(null);

		const formData = new FormData();
		formData.set("email", values.email);
		formData.set("password", values.password);

		const result = await signIn(null, formData);
		if (result?.message) {
			setServerMessage(result);
		}
	}

	return (
		<Card>
			<CardContent className="pt-5">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormItem>
							<FormLabel htmlFor="email">Email</FormLabel>
							<FormControl>
								<Input id="email" type="email" autoComplete="email" {...form.register("email")} />
							</FormControl>
							<FormMessage name="email" />
						</FormItem>

						<FormItem>
							<FormLabel htmlFor="password">Password</FormLabel>
							<FormControl>
								<Input
									id="password"
									type="password"
									autoComplete="current-password"
									{...form.register("password")}
								/>
							</FormControl>
							<FormMessage name="password" />
						</FormItem>

						{serverMessage?.message ? (
							<Alert variant={serverMessage.status === "success" ? "success" : "destructive"}>
								{serverMessage.message}
							</Alert>
						) : null}

						<Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
							{form.formState.isSubmitting ? "Working..." : "Sign in"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}
