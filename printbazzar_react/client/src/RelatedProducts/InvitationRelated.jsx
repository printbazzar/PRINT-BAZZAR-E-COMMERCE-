import { Link } from "react-router-dom";
import { products } from "../assets/data/HomeInvitations.js";

// Function to shuffle an array
function shuffleArray(array) {
  const shuffled = [...array]; // Make a copy to avoid mutating the original array
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function InvitationRelated() {
  // Shuffle and pick the first 6 products
  const randomProducts = shuffleArray(products).slice(0, 6);

  return (
    <section className="py-8">
      <div className=" mx-auto px-3">
        <h2 className="text-2xl xl:text-4xl font-bold text-center mb-6">
          Related Products
        </h2>
        <div className="max-w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 2xl:grid-cols-6 gap-6">
          {randomProducts.map((product, index) => (
            <Link
              to={`/${product.name.toLowerCase().replace(/ /g, "")}Details`} // Dynamic link based on product name
              key={index}
              className="flex flex-col items-center justify-center text-center p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow group"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-auto md:h-auto object-cover rounded-t-lg transition-transform duration-300 transform group-hover:scale-105"
              />
              <h3 className="text-md md:text-lg font-medium pt-3">{product.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
