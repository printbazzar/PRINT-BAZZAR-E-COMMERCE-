import { Link } from "react-router-dom";
import { products } from "../assets/data/homeBusinessEssentials.js";
import { Button } from "flowbite-react";

// Function to shuffle an array
function shuffleArray(array) {
  const shuffled = [...array]; // Make a copy to avoid mutating the original array
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function HomeBusinessEssentials() {

    const randomProducts = shuffleArray(products).slice(0, 8);

  return (
    <section className="py-8">
      <div className=" mx-auto px-3">
        <div className="flex justify-between">
            <h2 className="text-2xl sm:text-3xl font-bold text-start mb-6">
            Business Essentials
            </h2>
            <Button as={Link} to='/category/Business%20Essentials' color="dark" className="mb-6 hidden md:block">
            Explore More
            </Button>
            <Button as={Link} to='/category/Business%20Essentials' size="xs" color="dark" className="mb-6 block md:hidden">
            Explore More
            </Button>
        </div>
        <div className="max-w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5  gap-6">
          {randomProducts.map((product, index) => (
            <Link
              key={index}
              to={`/${product.name.toLowerCase().replace(/ /g, "")}Details`}
              className="flex flex-col items-center justify-center text-center p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="relative w-full h-auto">
                <img
                  src={product.image} 
                  alt={product.name}
                  className='w-full h-auto object-cover rounded-t-lg transition-transform duration-300 transform hover:scale-105'
                />
              </div>
              <h3 className="font-medium text-md md:text-xl text-gray-700 mt-3 line-clamp-2">
                {product.name}
              </h3>
              <h3 className="font-medium text-md md:text-lg text-red-700 mt-1">
                Starts at ₹{product.price} <br />
                <small className="text-gray-600">{product.description}</small>
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
