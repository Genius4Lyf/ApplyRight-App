import { useState, useEffect, useRef, useCallback } from 'react';

const useIdleTimeout = ({ idleTime = 14 * 60 * 1000, warningTime = 60 * 1000, onIdle, onWarning, enabled = true }) => {
    const [isIdle, setIsIdle] = useState(false);
    const [isWarning, setIsWarning] = useState(false);
    const [remainingTime, setRemainingTime] = useState(warningTime / 1000);

    const idleTimeoutRef = useRef(null);
    const warningIntervalRef = useRef(null);
    const lastActivityRef = useRef(Date.now());

    // Store latest callbacks and states to avoid re-binding event listeners or timers constantly
    const onIdleRef = useRef(onIdle);
    const onWarningRef = useRef(onWarning);
    const isWarningRef = useRef(isWarning);
    const isIdleRef = useRef(isIdle);

    useEffect(() => {
        onIdleRef.current = onIdle;
        onWarningRef.current = onWarning;
        isWarningRef.current = isWarning;
        isIdleRef.current = isIdle;
    });

    const clearTimers = useCallback(() => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    }, []);

    const startTimers = useCallback(() => {
        clearTimers();
        setIsIdle(false);
        setIsWarning(false);
        setRemainingTime(Math.ceil(warningTime / 1000));
        lastActivityRef.current = Date.now();

        // Start the idle timer
        idleTimeoutRef.current = setTimeout(() => {
            setIsWarning(true);
            if (onWarningRef.current) onWarningRef.current();

            // Start the warning countdown
            warningIntervalRef.current = setInterval(() => {
                setRemainingTime((prev) => {
                    if (prev <= 1) {
                        clearTimers();
                        setIsIdle(true);
                        setIsWarning(false);
                        if (onIdleRef.current) onIdleRef.current();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }, idleTime);
    }, [idleTime, warningTime, clearTimers]);

    const resetTimer = useCallback(() => {
        // Only allow resetting if we haven't already fully idled out
        if (!isIdleRef.current) {
            startTimers();
        }
    }, [startTimers]);

    useEffect(() => {
        if (!enabled) {
            clearTimers();
            setIsWarning(false);
            setIsIdle(false);
            return;
        }

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Only listen for activity if we are NOT in the warning state and NOT already idle
        const handleActivity = () => {
            if (!isWarningRef.current && !isIdleRef.current) {
                // Throttle the resets to prevent excessive timer resets
                const now = Date.now();
                if (now - lastActivityRef.current > 1000) {
                    resetTimer();
                }
            }
        };

        events.forEach((event) => window.addEventListener(event, handleActivity));

        // Start timers immediately when enabled
        startTimers();

        return () => {
            events.forEach((event) => window.removeEventListener(event, handleActivity));
            clearTimers();
        };
    }, [enabled, startTimers, clearTimers, resetTimer]);

    return { isIdle, isWarning, remainingTime, resetTimer };
};

export default useIdleTimeout;
