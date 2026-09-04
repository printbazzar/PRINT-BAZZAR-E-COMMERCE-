import { Breadcrumb } from 'flowbite-react'
import React from 'react'
import { HiHome } from 'react-icons/hi'
import { Link, useParams } from 'react-router-dom'

export default function BreadCrumb() {

    const {categoryName} = useParams()
  return (
    <div>
        <Breadcrumb className='2xl:text-6xl'>
        <Breadcrumb.Item icon={HiHome}>
          <Link to="/">Home</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/shop">Shop</Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>{categoryName}</Breadcrumb.Item>
      </Breadcrumb>
    </div>
  )
}
