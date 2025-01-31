'use client'
import React from "react";
import Cartrender from "../candidaterender/Candidaterender";
import { getCandidates } from "@/helpers/candidate.helper";
import Link from "next/link";

const OrderList = async () => {
  const usersResponse = await getCandidates();
  const usersarr = usersResponse.map((item) => ({
    list: item.list,
    postulation: item.postulation,
    imgUrl: item.imgUrl,
    id: item.id,
    user: {
      id: item.user.id,
      name: item.user.name,
      dni: item.user.dni,
      email: item.user.email,
      address: item.user.address,
      city: item.user.city,
      country: item.user.country,
      suffrage: item.user.suffrage,
    },
  }));

  return (
    <>
      {usersarr && usersarr.length > 0 ? (
        usersarr.map((item) => {
          return (
            <div className="grid grid-cols-5 bg-cuartiaryColor min-h-[82vh]">
              <Link href={`/candidates/${item.id}`} key={item.id}>
                <Cartrender key={item.id} {...item} />
              </Link>
            </div>
          );
        })
      ) : (
        <div className="flex justify-center items-center bg-cuartiaryColor min-h-[82vh]">
          <p className="text-lg text-gray-600 font-medium">
            You don't have any Candidates in this moment
          </p>
        </div>
      )}
    </>
  );
};

export default OrderList;
