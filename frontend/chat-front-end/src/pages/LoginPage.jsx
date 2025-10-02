import { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../lib/axios";

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const { login, isLoggingIn, authUser } = useAuthStore();

  useEffect(() => {
    if (!authUser) return;
    const role = authUser.role;
    if (role === "superadmin") navigate("/dashboard");
    else navigate("/dashboard");
  }, [authUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, platform: "web" };
      const user = await login(payload);
      const role = user?.role;
      if (role === "superadmin") navigate("/dashboard");
      else navigate("/dashboard");
    } catch (error) {
      const msg = error?.message || "Login failed";
      if (msg.toLowerCase().includes("client") && msg.toLowerCase().includes("mobile")) {
        toast.error("Client accounts can only sign in on mobile.");
      } else {
        toast.error(msg);
      }
    }
  };

  const handleForgot = async () => {
    const email = formData.email?.trim();
    if (!email) {
      return toast.error("Enter the email first, then tap Forgot.");
    }
    try {
      await axiosInstance.post("/auth/forgot-password", { identifier: email });
    } catch (_) {
      // Intentionally ignore errors to keep response generic
    } finally {
      toast.success("If the account exists, a reset request has been queued.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(251, 251, 251, 0.5), rgba(255, 255, 255, 0.5)),url('https://images.pexels.com/photos/2036686/pexels-photo-2036686.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2')",
      }}
    >
      <div className="absolute top-8 left-8">
        <img src="/logo.svg" alt="Your Brand Logo" className="w-24 h-24" />
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Log In</h1>
          <p className="text-gray-500 mt-2">Welcome back, please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Username</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="username"
            />
          </div>

          <div className="form-control">
            <div className="flex justify-between items-center">
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>
              <button type="button" onClick={handleForgot} className="text-sm text-blue-600">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="input input-bordered w-full pr-10"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full flex justify-center items-center gap-2"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
