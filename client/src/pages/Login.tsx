import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLocation, Link } from "wouter";
import * as authService from "@/services/authService";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const loginSchema = z.object({
    email: z.string().email({ message: "Insira um e-mail válido" }),
    password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

export default function Login() {
    const [, setLocation] = useLocation();
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof loginSchema>) {
        const result = await authService.login(values.email, values.password);

        if (result.success) {
            toast.success("Login efetuado com sucesso!", {
                icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
                style: {
                    border: '1px solid #10b981',
                }
            });
            setLocation("/");
        } else {
            toast.error(result.error, {
                style: {
                    border: '1px solid #ef4444',
                }
            });
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
            <Card className="w-full max-w-md shadow-lg border-primary/10">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo de volta</CardTitle>
                    <CardDescription>
                        Insira suas credenciais para acessar sua conta
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-mail</FormLabel>
                                        <FormControl>
                                            <Input placeholder="exemplo@email.com" {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center justify-between">
                                            <FormLabel>Senha</FormLabel>
                                            <Link href="/forgot" className="text-sm text-primary hover:underline">
                                                Esqueceu sua senha?
                                            </Link>
                                        </div>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full h-11 text-base font-semibold mt-6 shadow-sm">
                                Entrar
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-border pt-6">
                    <p className="text-sm text-muted-foreground">
                        Ainda não tem uma conta?{" "}
                        <Link href="/register" className="text-primary font-medium hover:underline">
                            Crie uma agra mesmo
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
