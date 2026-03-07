import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, CheckCircle2, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { adminLogin, adminSignup } from "@/api/adminAuth";
import {
  authValidationConfig,
  normalizeEmail,
  normalizeName,
  validateLogin,
  validateSignup,
} from "@/auth/validation";

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

export default function Auth() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("signin");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");

  const [loginTouched, setLoginTouched] = useState({});
  const [registerTouched, setRegisterTouched] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [registerErrors, setRegisterErrors] = useState({});

  const loginValidationErrors = useMemo(
    () => validateLogin({ email: loginEmail, password: loginPassword }),
    [loginEmail, loginPassword]
  );

  const registerValidationErrors = useMemo(
    () =>
      validateSignup({
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
      }),
    [regFullName, regEmail, regPassword]
  );

  const isLoginDisabled = useMemo(() => {
    return loginLoading || hasErrors(loginValidationErrors);
  }, [loginLoading, loginValidationErrors]);

  const isRegisterDisabled = useMemo(() => {
    return registerLoading || hasErrors(registerValidationErrors);
  }, [registerLoading, registerValidationErrors]);

  const saveSessionAndGo = ({ token }) => {
    localStorage.setItem("admin_token", token);
    navigate("/dashboard");
  };

  const handleLoginFieldChange = (field, value) => {
    if (field === "email") setLoginEmail(value);
    if (field === "password") setLoginPassword(value);
    setLoginError("");

    if (loginTouched[field]) {
      const nextErrors = validateLogin({
        email: field === "email" ? value : loginEmail,
        password: field === "password" ? value : loginPassword,
      });
      setLoginErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
    }
  };

  const handleRegisterFieldChange = (field, value) => {
    if (field === "full_name") setRegFullName(value);
    if (field === "email") setRegEmail(value);
    if (field === "password") setRegPassword(value);
    setRegisterError("");

    if (registerTouched[field]) {
      const nextErrors = validateSignup({
        full_name: field === "full_name" ? value : regFullName,
        email: field === "email" ? value : regEmail,
        password: field === "password" ? value : regPassword,
      });
      setRegisterErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
    }
  };

  const handleLoginFieldBlur = (field) => {
    setLoginTouched((prev) => ({ ...prev, [field]: true }));
    const nextErrors = validateLogin({ email: loginEmail, password: loginPassword });
    setLoginErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
  };

  const handleRegisterFieldBlur = (field) => {
    setRegisterTouched((prev) => ({ ...prev, [field]: true }));
    const nextErrors = validateSignup({
      full_name: regFullName,
      email: regEmail,
      password: regPassword,
    });
    setRegisterErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    const nextErrors = validateLogin({ email: loginEmail, password: loginPassword });
    setLoginTouched({ email: true, password: true });
    setLoginErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setLoginLoading(true);

    try {
      const { token } = await adminLogin({
        email: normalizeEmail(loginEmail),
        password: loginPassword,
      });
      saveSessionAndGo({ token });
    } catch (err) {
      setLoginError(err?.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError("");

    const nextErrors = validateSignup({
      full_name: regFullName,
      email: regEmail,
      password: regPassword,
    });
    setRegisterTouched({ full_name: true, email: true, password: true });
    setRegisterErrors(nextErrors);
    if (hasErrors(nextErrors)) return;

    setRegisterLoading(true);

    try {
      const { token } = await adminSignup({
        full_name: normalizeName(regFullName),
        email: normalizeEmail(regEmail),
        password: regPassword,
        role: "personnel",
      });
      saveSessionAndGo({ token });
    } catch (err) {
      setRegisterError(err?.message || "Registration failed");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC] relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center">
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

        <Card className="w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-2xl overflow-hidden bg-white">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              setLoginError("");
              setRegisterError("");
              setLoginTouched({});
              setRegisterTouched({});
              setLoginErrors({});
              setRegisterErrors({});
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
                        onChange={(e) => handleLoginFieldChange("email", e.target.value)}
                        onBlur={() => handleLoginFieldBlur("email")}
                        required
                        aria-invalid={Boolean(loginErrors.email)}
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-[10px] text-red-600 px-1" role="alert">
                        {loginErrors.email}
                      </p>
                    )}
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
                        placeholder="********"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm font-mono transition-all"
                        value={loginPassword}
                        onChange={(e) => handleLoginFieldChange("password", e.target.value)}
                        onBlur={() => handleLoginFieldBlur("password")}
                        required
                        aria-invalid={Boolean(loginErrors.password)}
                      />
                    </div>
                    {loginErrors.password && (
                      <p className="text-[10px] text-red-600 px-1" role="alert">
                        {loginErrors.password}
                      </p>
                    )}
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
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <p className="text-[10px] font-semibold text-blue-700">
                      Registration creates a <span className="font-black uppercase tracking-wide">Personnel</span> account only.
                      Admin access is invite-only and must be sent by an existing admin after account creation.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Full Name</label>
                    <div className="relative group">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="text"
                        placeholder="Juan Dela Cruz"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm transition-all"
                        value={regFullName}
                        onChange={(e) => handleRegisterFieldChange("full_name", e.target.value)}
                        onBlur={() => handleRegisterFieldBlur("full_name")}
                        required
                        aria-invalid={Boolean(registerErrors.full_name)}
                      />
                    </div>
                    {registerErrors.full_name && (
                      <p className="text-[10px] text-red-600 px-1" role="alert">
                        {registerErrors.full_name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="email"
                        placeholder="name@dagupan.gov"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm transition-all"
                        value={regEmail}
                        onChange={(e) => handleRegisterFieldChange("email", e.target.value)}
                        onBlur={() => handleRegisterFieldBlur("email")}
                        required
                        aria-invalid={Boolean(registerErrors.email)}
                      />
                    </div>
                    {registerErrors.email && (
                      <p className="text-[10px] text-red-600 px-1" role="alert">
                        {registerErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest px-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                      <Input
                        type="password"
                        placeholder="********"
                        className="pl-10 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm font-mono transition-all"
                        value={regPassword}
                        onChange={(e) => handleRegisterFieldChange("password", e.target.value)}
                        onBlur={() => handleRegisterFieldBlur("password")}
                        required
                        aria-invalid={Boolean(registerErrors.password)}
                      />
                    </div>
                    {registerErrors.password ? (
                      <p className="text-[10px] text-red-600 px-1" role="alert">
                        {registerErrors.password}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 px-1">
                        Minimum {authValidationConfig.minPasswordLength} characters and at least 3 of: uppercase,
                        lowercase, number, special character.
                      </p>
                    )}
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

              <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  Authorized access only. All sessions are logged and monitored by the City Information Technology Office.
                </p>
              </div>
            </CardContent>
          </Tabs>
        </Card>

        <div className="mt-12 text-center space-y-1 opacity-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered by CITO Dagupan - V2.4.0</p>
        </div>
      </div>
    </div>
  );
}
