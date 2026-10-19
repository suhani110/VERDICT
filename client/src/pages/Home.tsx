import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-[#0D0B09] text-[#F5F2EB] flex items-center justify-center">
      <section className="text-center max-w-3xl px-6">
        <p className="uppercase tracking-[0.5rem] text-[#B88A44] text-sm mb-6">
          New York • 1963
        </p>

        <h1
          className="text-7xl md:text-8xl font-bold mb-6"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          VERDICT
        </h1>

        <h2
          className="text-3xl md:text-4xl mb-8"
          style={{ fontFamily: "Cormorant Garamond" }}
        >
          Trust is a luxury.
          <br />
          Betrayal is business.
        </h2>

        <p className="text-lg leading-8 text-[#D8C7A1] mb-12">
          In a city ruled by loyalty and deception, every conversation is a
          gamble, every vote carries weight, and every decision could change the
          fate of the Family.
        </p>

        <button
          onClick={() => navigate("/login")}
          className="bg-[#B88A44] hover:bg-[#9D7538] transition-all duration-300 text-black font-semibold px-10 py-4 rounded-sm tracking-widest uppercase"
        >
          Enter the Family
        </button>
      </section>
    </main>
  );
}

export default Home;