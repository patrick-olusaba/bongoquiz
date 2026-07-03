import { motion } from 'motion/react';
import treesBg from '../assets/trees.png';

export function LiveBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
                className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${treesBg})` }}
                animate={{
                    scale: [1.05, 1.15, 1.05],
                }}
                transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />
            <div className="absolute inset-0 bg-black/60" />
        </div>
    );
}
