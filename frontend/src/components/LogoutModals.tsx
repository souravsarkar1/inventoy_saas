import Modal from "./ui/Modal"

const LogoutModals = ({ isLogoutModal, setLogoutModal, logout }: { isLogoutModal: boolean, setLogoutModal: (value: boolean) => void, logout: () => void }) => {
    return (
        <Modal isOpen={isLogoutModal} onClose={() => setLogoutModal(false)} title="Logout">
            <div className="flex flex-col gap-6">
                <p className="text-text-secondary">Are you sure you want to logout?</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setLogoutModal(false)} className="btn btn-secondary font-black text-sm uppercase tracking-widest">Cancel</button>
                    <button onClick={logout} className="btn btn-danger font-black text-sm uppercase tracking-widest bg-red-500">Logout</button>
                </div>
            </div>
        </Modal>
    )
}

export default LogoutModals