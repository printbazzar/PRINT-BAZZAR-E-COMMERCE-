import React from 'react'
import error_img from '../assets/images/error_img.png'
import { Link } from 'react-router-dom'
export default function Missing() {
  return (
    <div className='flex justify-center flex-col items-center 2xl:h-[60vh]'>
        <img src={error_img} className='w-[20rem] h-[20rem]' alt="" />
        <div className='py-5 text-center'>
            <p className='font-bold text-3xl'>PAGE NOT FOUND</p>
            <Link to='/' className='mb-5 font-medium text-xl text-blue-500 hover:underline'>GO TO HOME</Link>
        </div>
    </div>
  )
}
