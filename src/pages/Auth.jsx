import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminAuth } from "@/auth/AdminAuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import beaconLogo from "../../img/beacon_logo.png";
import { adminLogin } from "@/api/adminAuth";
import {
  normalizeEmail,
  validateLogin,
} from "@/auth/validation";

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

export default function Auth() {
  const navigate = useNavigate();
  const { refreshMe } = useAdminAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginTouched, setLoginTouched] = useState({});
  const [loginErrors, setLoginErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const loginValidationErrors = useMemo(
    () => validateLogin({ email: loginEmail, password: loginPassword }),
    [loginEmail, loginPassword]
  );

  const isLoginDisabled = useMemo(() => {
    return loginLoading || hasErrors(loginValidationErrors);
  }, [loginLoading, loginValidationErrors]);

  const saveSessionAndGo = async ({ token }) => {
    localStorage.setItem("admin_token", token);
    const account = await refreshMe();
    if (account) navigate("/dashboard");
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

  const handleLoginFieldBlur = (field) => {
    setLoginTouched((prev) => ({ ...prev, [field]: true }));
    const nextErrors = validateLogin({ email: loginEmail, password: loginPassword });
    setLoginErrors((prev) => ({ ...prev, [field]: nextErrors[field] || "" }));
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
      await saveSessionAndGo({ token });
    } catch (err) {
      setLoginError(err?.message || "Login failed");
    } finally {
      setLoginLoading(false);
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
          <div className="flex h-[80px] w-[80px] items-center justify-center overflow-hidden rounded-xl bg-blue-600 shadow-lg mb-4">
            <img
              src={beaconLogo}
              alt="Beacon logo"
              className="h-full w-full scale-[1.5] object-cover object-[center_66%]"
            />
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
          <CardContent className="p-8">
            {loginError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11px] font-semibold text-red-600">{loginError}</p>
              </div>
            )}

            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
              <p className="text-[10px] font-semibold text-blue-700">
                Contact your administrator for access.
              </p>
            </div>

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
                <div className="flex items-center px-1">
                  <label className="text-[10px] font-black text-[#2563EB] uppercase tracking-widest">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="pl-10 pr-11 h-11 bg-slate-50/50 border-slate-200 focus-visible:ring-[#2563EB] rounded-lg text-sm font-mono transition-all"
                    value={loginPassword}
                    onChange={(e) => handleLoginFieldChange("password", e.target.value)}
                    onBlur={() => handleLoginFieldBlur("password")}
                    required
                    aria-invalid={Boolean(loginErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#2563EB] focus:outline-none focus:text-[#2563EB]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="text-[10px] text-red-600 px-1" role="alert">
                    {loginErrors.password}
                  </p>
                )}
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

            <div className="mt-8 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Authorized access only. All sessions are logged and monitored by the City Information Technology Office.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-12 text-center space-y-1 opacity-50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Powered by CITO Dagupan - V2.4.0</p>
        </div>
      </div>
    </div>
  );
}
