import React from "react";
import { FaFacebookF, FaTwitter, FaInstagram, FaEnvelope, FaPhone, FaGithub, FaLinkedinIn } from "react-icons/fa";
import { FaWhatsapp } from "react-icons/fa6";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className=" {/* bg-slate-200 */} bg-slate-200 text-purple-900 py-8 pt-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {/* Kolom 1: Tentang */}
          <div>
            <h3 className="text-lg font-semibold mb-4">About us</h3>
            <p className="text-base">ini adalah website tentang cuaca kalian bisa cek cuaca di daerah kalian masing masing jika ada kritik dan saran silakan hubungi melalui link yang di sediakan</p>
          </div>
      
          {/* Kolom 2: Tautan Cepat */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tautan Navigasi</h3>
            <ul className="space-y-2">
              <li>
                <Link to={"./"} className="hover:text-gray-300 transition duration-300">
                  Home
                </Link>
              </li>
              <li>
                <Link to={"./Radar"} className="hover:text-gray-300 transition duration-300">
                  Radar
                </Link>
              </li>
              <li>
                <Link to={"./AboutUs"} className="hover:text-gray-300 transition duration-300">
                  About us
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Kontak */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Hubungi Kami</h3>
            <div className="space-y-2 cursor-pointer">
              <p className="flex items-center">
                <FaEnvelope className="mr-2 cursor-pointer" size={18} />
                <a href="#patradinata08@gmail.com" className="hover:text-gray-300 transition duration-300"></a>
                patradinata08@gmail.com
              </p>
              <p className="flex items-center">
                <FaPhone className="mr-2" size={18} />
                <a href="tel:+6285788229884" className="hover:text-gray-300 transition duration-300">
                  +6285788229884
                </a>
              </p>
            </div>
            <div className="mt-4 flex space-x-4 gap-3">
              <a href="#" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaFacebookF size={24} />
              </a>
              <a href="#" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaTwitter size={24} />
              </a>
              <a href="https://www/instagram.com/patra_dinata" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaInstagram size={24} />
              </a>
              <a href="#" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaGithub size={24} />
              </a>
              <a href="#" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaWhatsapp size={24} />
              </a>
              <a href="#" className="hover:text-gray-300 transition duration-300 text-blue-500">
                <FaLinkedinIn size={24} />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm">
          <p>
            Copyright &copy; {new Date().getFullYear()}{" "}
            <a className="none" href="https://www.instagram.com/patra_dinata">
              Patra Dinata
            </a>{" "}
            All Right Reserved&trade;
          </p>
          <p className="capitalize">hak cipta dilindungi undang-undang</p>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
