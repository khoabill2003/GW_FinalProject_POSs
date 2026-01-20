'use client';

import { useState } from 'react';
import Modal from './Modal';

interface RestaurantInfoProps {
  name: string;
  address?: string;
  phone?: string;
  image?: string;
  isMainBranch?: boolean;
}

export default function RestaurantInfo({
  name,
  address = '',
  phone = '',
  image = '',
  isMainBranch = false,
}: RestaurantInfoProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* Restaurant Info Container */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-md p-6 border border-amber-200 relative min-h-[150px]">
        {/* Logo - Top Right Corner */}
        {image && (
          <button
            onClick={() => setShowModal(true)}
            className="absolute top-4 right-4 cursor-pointer hover:shadow-lg transition-shadow"
            title="Click để xem thông tin chi tiết"
          >
            <img
              src={image}
              alt={name}
              className="w-24 h-24 object-cover rounded-lg shadow-md hover:shadow-xl transition-shadow"
            />
          </button>
        )}

        {/* Info Content */}
        <div className="pr-32">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-amber-900">
              {isMainBranch ? '🏢' : '🏪'} {name}
            </h2>
            {isMainBranch && (
              <span className="bg-amber-200 text-amber-800 text-xs font-bold px-2 py-1 rounded-full">
                CHI NHÁNH CHÍNH
              </span>
            )}
          </div>

          <div className="mt-4 space-y-2 text-amber-900">
            {address && (
              <p className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <span>{address}</span>
              </p>
            )}
            {phone && (
              <p className="flex items-center gap-2">
                <span className="text-lg">📞</span>
                <span>{phone}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showModal && (
        <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            {/* Logo */}
            {image && (
              <div className="flex justify-center mb-6">
                <img
                  src={image}
                  alt={name}
                  className="w-32 h-32 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}

            {/* Details */}
            <h2 className="text-2xl font-bold text-center mb-6">{name}</h2>

            <div className="space-y-4">
              {address && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-gray-600 font-semibold">Địa chỉ</p>
                  <p className="text-lg text-gray-800 mt-1">{address}</p>
                </div>
              )}

              {phone && (
                <div className="pb-4 border-b">
                  <p className="text-sm text-gray-600 font-semibold">Điện thoại</p>
                  <p className="text-lg text-gray-800 mt-1">
                    <a
                      href={`tel:${phone}`}
                      className="text-primary-600 hover:underline"
                    >
                      {phone}
                    </a>
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
            >
              Đóng
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
