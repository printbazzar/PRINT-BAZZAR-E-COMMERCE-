import React from 'react';
import Logo from '/pb.png'

const Preloader = () => {
  return (
    <div className="preloader">
      <div className="loader">
      <img src={Logo} alt="" />
      </div> 
    </div>
  );
};

export default Preloader;
