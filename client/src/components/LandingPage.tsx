

const LandingPage = () => {
    return (
        <div className="landing-page min-h-screen flex flex-col">
            <header className="landing-page-header bg-blue-600 text-white p-6">
                <h1 className="text-4xl font-bold">Welcome to our chat service</h1>
                <p className="text-lg mt-2">Chatservice to chat with friends</p>
            </header>
            <main className="landing-page-main flex-grow p-6">
                <section className="cta">
                    <button 
                        className="bg-blue-500 text-white py-2 px-4 rounded mr-4"
                        onClick={() => window.location.href = '/signup'}
                    >
                        Sign Up
                    </button> 
                    <button 
                        className="bg-gray-500 text-white py-2 px-4 rounded"
                        onClick={() => window.location.href = '/login'}
                    >
                        Login
                    </button>
                </section>  </main>
            <footer className="landing-page-footer bg-gray-800 text-white p-4 text-center">
                <p>&copy; chat app</p>
            </footer>
        </div>
    );
};

export default LandingPage;
