import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Header from "@/components/Header";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Shield, User, Key, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PeriodProvider } from "@/contexts/PeriodContext";

export default function Admin() {
    const { users, user: currentUser, updateUserRole, deleteUser, resetUserPassword } = useAuthStore();
    const [resetModal, setResetModal] = useState<{ isOpen: boolean, password: string, email: string } | null>(null);

    const handleRoleChange = (userId: string, newRole: "admin" | "user") => {
        updateUserRole(userId, newRole);
        toast.success("Nível de acesso atualizado com sucesso");
    };

    const handleDelete = (userId: string) => {
        if (userId === currentUser?.id) {
            toast.error("Você não pode excluir sua própria conta");
            return;
        }

        // In a real app we would use a confirmation dialog here
        if (confirm("Tem certeza que deseja excluir este usuário?")) {
            deleteUser(userId);
            toast.success("Usuário excluído com sucesso");
        }
    };

    const handleResetPassword = (userId: string, email: string) => {
        // Generate an 8 character random password
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let newPassword = '';
        for (let i = 0; i < 8; i++) {
            newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        resetUserPassword(userId, newPassword);
        setResetModal({ isOpen: true, password: newPassword, email });
    };

    const copyToClipboard = () => {
        if (!resetModal) return;
        navigator.clipboard.writeText(resetModal.password).then(() => {
            toast.success("Senha copiada para a área de transferência!");
        });
    };

    return (
        <PeriodProvider>
            <div className="min-h-screen bg-background">
                <Header />
                <main className="px-6 py-6 max-w-[1440px] mx-auto space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-[#0F4C75]">Administração de Usuários</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Gerencie o acesso e permissões das contas da plataforma.
                        </p>
                    </div>

                    <Card className="border-primary/10 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4">
                            <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
                            <CardDescription>
                                Total de {users.length} usuário(s) ativos no sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[300px]">Usuário</TableHead>
                                        <TableHead>E-mail</TableHead>
                                        <TableHead>Nível de Acesso</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {u.name}
                                                    {u.id === currentUser?.id && (
                                                        <Badge variant="secondary" className="text-[10px] ml-2">Você</Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={u.role}
                                                    onValueChange={(value: "admin" | "user") => handleRoleChange(u.id, value)}
                                                    disabled={u.id === currentUser?.id}
                                                >
                                                    <SelectTrigger className="w-[140px] h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="user">
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-4 w-4 text-muted-foreground" />
                                                                <span>Usuário</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="admin">
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="h-4 w-4 text-[#0F4C75]" />
                                                                <span className="font-medium text-[#0F4C75]">Admin</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleResetPassword(u.id, u.email)}
                                                        className="text-[#0F4C75] hover:text-[#0F4C75] hover:bg-[#0F4C75]/10"
                                                        title="Resetar Senha"
                                                    >
                                                        <Key className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(u.id)}
                                                        disabled={u.id === currentUser?.id}
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {users.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                Nenhum usuário encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </main>

                {/* Password Reset Modal Overlay */}
                {resetModal?.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-sm shadow-xl border-primary/20 animate-in zoom-in-95 duration-200">
                            <CardHeader className="text-center pb-4">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-xl">Senha Redefinida!</CardTitle>
                                <CardDescription className="pt-2">
                                    A nova senha temporária para <strong>{resetModal.email}</strong> foi gerada.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-col items-center gap-4">
                                <div className="w-full rounded-md bg-muted p-4 text-center border border-border">
                                    <code className="text-lg font-bold tracking-wider text-[#0F4C75]">
                                        {resetModal.password}
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full border-primary/20 hover:bg-primary/5 text-[#0F4C75]"
                                    onClick={copyToClipboard}
                                >
                                    Copiar Senha
                                </Button>
                            </CardContent>
                            <div className="p-4 pt-0">
                                <Button
                                    className="w-full h-11 bg-[#0F4C75] hover:bg-[#0F4C75]/90"
                                    onClick={() => setResetModal(null)}
                                >
                                    Concluir
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </PeriodProvider>
    );
}
