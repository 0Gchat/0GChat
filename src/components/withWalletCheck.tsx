import React from "react";
import { useNavigate } from "react-router-dom";

const withWalletCheck = (WrappedComponent: React.ComponentType) => {
    return (props: any) => {
        const navigate = useNavigate();
        const walletAddress = localStorage.getItem("walletAddress")
        const [isChecking, setIsChecking] = React.useState(true);

        React.useEffect(() => {
            if (!walletAddress) {
                navigate("/");
            } else {
                setIsChecking(false);
            }
        }, [walletAddress, navigate]);

        // console.log(walletAddress)


        // 如果正在检查钱包连接，不渲染任何内容
        if (isChecking) {
            return null;
        }

        // 如果用户已连接钱包，渲染目标组件
        return <WrappedComponent {...props} />;
    };
};

export default withWalletCheck;