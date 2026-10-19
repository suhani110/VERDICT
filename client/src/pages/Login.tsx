import { Link, useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center px-6">
      <div className="w-full max-w-md border border-[#B88A44] rounded-lg p-8 bg-[#151210]">
        <h1
          className="text-5xl text-center mb-8"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          Welcome Back
        </h1>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128] outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-4 py-3 rounded bg-[#201C19] border border-[#3A3128] outline-none"
          />

          <button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-[#B88A44] text-black py-3 rounded font-semibold hover:bg-[#9D7538] transition"
          >
            Login
          </button>
        </div>

        <p className="text-center mt-6 text-[#B8B8B8]">
          New to VERDICT?{" "}
          <Link
            to="/register"
            className="text-[#B88A44] hover:underline"
          >
            Create an Account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default Login;