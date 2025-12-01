
  return (
    <div className="max-w-6xl mx-auto pb-12 relative">
      {/* Floating WhatsApp - Adjusted bottom position for mobile to clear BottomNav */}
      {whatsappLink && (
        <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-24 md:bottom-6 right-6 z-[60] p-4 bg-[#25D366] rounded-full text-white shadow-lg hover:bg-[#128C7E] hover:scale-110 transition-all lg:hidden animate-[scaleIn_0.5s]"
            title="Falar no WhatsApp"
        >
            <MessageCircle size={28} className="fill-current" />
        </a>
      )}

      <div className="flex items-center text-sm text-gray-500 mb-6">
          <Link to={homeLink} className="hover:text-primary-600 flex items-center"><ArrowLeft size={12} className="mr-1"/> {homeLabel}</Link> 
          <span className="mx-2">/</span>
          <Link to={tripsLink} className="hover:text-primary-600">{tripsLabel}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{trip.title}</span>
      </div>
