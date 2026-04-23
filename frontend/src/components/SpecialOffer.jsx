
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";

const SpecialOffer = () => {
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const { data } = await API.get("/api/offers");
        const activeOffer = Array.isArray(data) ? data.find((item) => item.isActive) : null;
        setOffer(activeOffer || null);
      } catch {
        setOffer(null);
      }
    };

    fetchOffer();
  }, []);

  if (!offer) return null;

  const subText =
    offer.bannerText?.trim() ||
    (offer.discountPercentage ? `Save ${offer.discountPercentage}% on selected products` : "");

  return (
    <section className="container mx-auto px-4 mb-16">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
          <div className="text-center md:text-left mb-6 md:mb-0">
            <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium">
              Live Offer
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4">
              {offer.title}
            </h2>
            {offer.description ? <p className="mt-2 opacity-90">{offer.description}</p> : null}
            {subText ? <p className="mt-1 opacity-90">{subText}</p> : null}
          </div>
          <Link
            to={`/products?offer=${offer._id}`}
            className="bg-white text-indigo-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition transform hover:scale-105"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SpecialOffer;
