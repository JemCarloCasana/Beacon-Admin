import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, CheckCircle2, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { adminLogin, adminSignup } from "@/api/adminAuth";

export default function Auth() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("signin");

  // Role selection (register only)
  const [selectedRole, setSelectedRole] = useState("personnel");

  // Sign in fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register fields
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Loading + errors (separate per tab)
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const isLoginDisabled = useMemo(() => {
    return loginLoading || !loginEmail.trim() || !loginPassword;
  }, [loginLoading, loginEmail, loginPassword]);

  const isRegisterDisabled = useMemo(() => {
    return (
      registerLoading ||
      !regFullName.trim() ||
      !regEmail.trim() ||
      !regPassword ||
      regPassword.length < 8
    );
  }, [registerLoading, regFullName, regEmail, regPassword]);

  const saveSessionAndGo = ({ admin, token }) => {
    // Only store token in localStorage - permissions are fetched from /admin/me endpoint
    localStorage.setItem("admin_token", token);
    navigate("/dashboard");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const { admin, token } = await adminLogin({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      saveSessionAndGo({ admin, token });
    } catch (err) {
      setLoginError(err?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");

    if (regPassword.length < 8) {
      setRegisterError("Password must be at least 8 characters.");
      return;
    }

    setRegisterLoading(true);

    try {
      const { admin, token } = await adminSignup({
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: selectedRole, // "admin" or "personnel"
      });
      saveSessionAndGo({ admin, token });
    } catch (err) {
      setRegisterError(err?.message || "Registration failed");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden font-sans">
      {/* Grid Background Pattern */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center transform transition-all duration-700 hover:scale-105">
          <div className="h-12 w-12 bg-[#1E3A8A] rounded-xl flex items-center justify-center shadow-lg mb-4">
            <Shield className="text-white h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Beacon Command</h1>
          <p className="text-sm font-bold text-[#64748B] mt-1 uppercase tracking-wide">
            Public Safety & Emergency Management
          </p>
          <p className="text-[10px] font-black text-[#2563EB] mt-0.5 uppercase tracking-[0.2em]">
            Dagupan City Government
          </p>
        </div>

        {/* Auth Card */}
        <Card className="w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden bg-white">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              // clear errors when switching tabs
              setLoginError("");
              setRegisterError("");
            }}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-2 h-14 bg-transparent p-0 border-b border-slate-100 rounded-none">
              <TabsTrigger
                value="signin"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2563EB] data-[state=active]:bg-transparent data-[state=active]:text-[#2563EB] text-slate-400 font-bold text-sm transition-all"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#2563EB] data-[state=active]:bg-transparent data-[state=active]:text-[#2563EB] text-slate-400 font-bold text-sm transition-all"
              >
                Register
              </TabsTrigger>
            </TabsList>

            <CardContent className="p-8">
              <TabsContent value="signin" className="mt-0 outline-none animate-in fade-in duration-500">
                {loginError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-[11px] font-semibold text-red-600">{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest">
                        Email Address
                      </label>
                    </div>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="email"
                        placeholder="name@dagupan.gov"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm transition-all"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest">
                        Password
                      </label>
                      <button
                        type="button"
                        className="text-[9px] font-black text-[#2563EB] uppercase tracking-widest hover:underline decoration-2 underline-offset-4"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm font-mono transition-all"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 px-1">
                    <Checkbox
                      id="remember"
                      className="border-slate-300 data-[state=checked]:bg-[#2563EB] data-[state=checked]:border-[#2563EB]"
                    />
                    <label htmlFor="remember" className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                      Keep me logged in for 30 days
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoginDisabled}
                    className="w-full h-12 bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(30,64,175,0.2)] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {loginLoading ? (
                      "Accessing..."
                    ) : (
                      <>
                        Access Dashboard
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-0 outline-none animate-in slide-in-from-right-4 duration-500">
                {registerError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="text-[11px] font-semibold text-red-600">{registerError}</p>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">
                      Select Organization Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedRole("personnel")}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                          selectedRole === "personnel"
                            ? "border-[#2563EB] bg-blue-50/50"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <Users className={cn("h-5 w-5", selectedRole === "personnel" ? "text-[#2563EB]" : "text-slate-400")} />
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", selectedRole === "personnel" ? "text-[#2563EB]" : "text-slate-400")}>
                          Personnel
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedRole("admin")}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-1.5",
                          selectedRole === "admin"
                            ? "border-[#2563EB] bg-blue-50/50"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <Shield className={cn("h-5 w-5", selectedRole === "admin" ? "text-[#2563EB]" : "text-slate-400")} />
                        <span className={cn("text-[9px] font-black uppercase tracking-widest", selectedRole === "admin" ? "text-[#2563EB]" : "text-slate-400")}>
                          Admin
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative group">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="text"
                        placeholder="Juan Dela Cruz"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm transition-all"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="email"
                        placeholder="name@dagupan.gov"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm transition-all"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm font-mono transition-all"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 px-1">
                      Minimum 8 characters.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRegisterDisabled}
                    className="w-full h-12 bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A] hover:from-[#1D4ED8] hover:to-[#1E40AF] text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(30,64,175,0.2)] flex items-center justify-center gap-2 transition-all mt-2"
                  >
                    {registerLoading ? (
                      "Creating Account..."
                    ) : (
                      <>
                        Create Agency Account
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Security Footer Notice */}
              <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  Authorized access only. All sessions are logged and monitored by the City Information Technology Office.
                </p>
              </div>
            </CardContent>
          </Tabs>
        </Card>

        {/* Footer Section */}
        <div className="mt-12 text-center space-y-1 opacity-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered by CITO Dagupan — V2.4.0</p>
        </div>
      </div>
    </div>
  );
}
