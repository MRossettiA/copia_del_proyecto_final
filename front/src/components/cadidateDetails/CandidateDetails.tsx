'use client'
import React from 'react'
import ICandidate from '@/interfaces/ICandidate'
import Image from 'next/image'
import Swal from 'sweetalert2'


const CandidateDetails = async (props:ICandidate) => {
    const handleVotar = ()=>{
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Votación generada correctamente",
        showConfirmButton: false,
        timer: 1500
      });
    }
    
  return (
    <div className='w-full flex flex-col items-center'>
      <div className='bg-white w-11/12 p-4 flex flex-col items-center rounded-t-2xl drop-shadow-2xl border-2 mt-4'>
        <h1 className='text-2xl font-bold capitalize text-tertiaryColor'>Candidato a Votacion {props.postulation}</h1>
        <p>{props.campaignDescription}</p>
      </div>
      <div className='grid grid-cols-2 w-11/12 justify-center gap-2 h-[65vh]'>
        <div className='bg-white flex justify-center items-center mt-2 drop-shadow-2xl border-2 p-8 rounded-b-2xl'>
            <div className='bg-cuartiaryColor w-80 h-96 relative rounded-xl overflow-hidden drop-shadow-2xl border-2'>
                <div>
                    <Image src={props.imgUrl} alt="fotoCandidato" fill />
                </div>
                <div className='bg-primaryColor py-4 absolute bottom-0 w-full flex flex-col items-center'>
                    <h3 className='font-bold text-xl capitalize'>{props.user.name}</h3>
                    <p>{props.list}</p>
                    <button
                    className='bg-tertiaryColor text-cuartiaryColor rounded-full px-12 py-2 hover:scale-105 hover:bg-secundaryColor ease-in-out duration-300 hover:text-tertiaryColor'
                    onClick={handleVotar}
                    >Votar</button>
                </div>
            </div>
        </div>
        <div className='bg-white mt-2 drop-shadow-2xl border-2 p-4 rounded-b-2xl'>
            <div className='bg-secundaryColor h-full p-4 rounded-2xl drop-shadow-2xl text-cuartiaryColor'>
                <h2>Propuestas:</h2>
                <p className='ml-4'>{props.proposals}</p>   
            </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDetails
