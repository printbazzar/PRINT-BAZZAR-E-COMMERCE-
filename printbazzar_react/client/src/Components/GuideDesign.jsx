import React from 'react'
import Guide from '../assets/images/Guide.png'
import MobileGuide from '../assets/images/Guide_mobile.png'

export default function GuideDesign() {
  return (
    <div className='mt-8 xl:mt-12'>
        <h3 className='text-start text-xl lg:text-3xl font-medium'>Design Guide</h3>
        <img src={Guide} className='mt-3 lg:mt-5 hidden lg:block' alt="Design Guid" />
        <img src={MobileGuide} className='mt-3 lg:mt-5 block lg:hidden' alt="Design Guid" />
    </div>
  )
}
