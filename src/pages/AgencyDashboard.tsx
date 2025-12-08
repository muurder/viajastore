      {activeTab === 'OPERATIONS' && (
          <div className="animate-[fadeIn_0.3s]">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2"><Bus size={24}/> Gerenciar Operacional</h2>
                  <p className="text-gray-600 mb-4">Organize seus passageiros em assentos e quartos para cada viagem.</p>
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-start gap-3">
                    <Info size={20} className="flex-shrink-0 mt-0.5"/>
                    <p className="text-sm">
                        Selecione uma viagem na barra lateral para começar a configurar o layout do transporte e a lista de quartos.
                        As alterações são salvas automaticamente.
                    </p>
                  </div>
              </div>
              <OperationsModule 
                  myTrips={myTrips} 
                  myBookings={myBookings} 
                  clients={clients} 
                  selectedTripId={selectedOperationalTripId} 
                  onSelectTrip={setSelectedOperationalTripId}
                  onSaveTripData={updateTripOperationalData}
                  currentAgency={currentAgency}
              />
          </div>
      )}