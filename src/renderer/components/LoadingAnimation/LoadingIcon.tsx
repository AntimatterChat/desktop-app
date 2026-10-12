// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

// The Antimatter mark: a particle and its antiparticle on mirrored orbits, around a spark.
// The orbits are drawn in their own (rotated) frames, so that the particles can travel along them, as mirror images.
const ORBIT_FROM_LEFT = 'M7 32a25 9.5 0 1 1 50 0a25 9.5 0 1 1 -50 0';
const ORBIT_FROM_RIGHT = 'M57 32a25 9.5 0 1 0 -50 0a25 9.5 0 1 0 50 0';
const SPARK = 'M32 20.5Q33.9 30.1 43.5 32Q33.9 33.9 32 43.5Q30.1 33.9 20.5 32Q30.1 30.1 32 20.5Z';

const ORBIT_DURATION = '2.4s';

type Props = {
    reducedMotion?: boolean;
};

/**
 * A function component for inlining the SVG of the animated loading logo.
 * The particle and the antiparticle circle their orbits in opposite directions, unless the user asked for reduced motion.
 */
function LoadingIcon({reducedMotion = false}: Props) {
    return (
        <svg
            width='104'
            height='104'
            viewBox='0 0 64 64'
            xmlns='http://www.w3.org/2000/svg'
            role='img'
            aria-label='Antimatter'
        >
            <g className='LoadingAnimation__atom'>
                <g transform='rotate(45 32 32)'>
                    <path
                        className='LoadingAnimation__orbit LoadingAnimation__orbit--matter'
                        d={ORBIT_FROM_LEFT}
                        pathLength={100}
                        fill='none'
                        strokeWidth='4.5'
                    />
                    <g className='LoadingAnimation__particle-container'>
                        <circle
                            className='LoadingAnimation__particle LoadingAnimation__particle--matter'
                            r='5.5'
                            cx={reducedMotion ? 7 : 0}
                            cy={reducedMotion ? 32 : 0}
                        >
                            {!reducedMotion && (
                                <animateMotion
                                    dur={ORBIT_DURATION}
                                    repeatCount='indefinite'
                                    path={ORBIT_FROM_LEFT}
                                />
                            )}
                        </circle>
                    </g>
                </g>
                <g transform='rotate(-45 32 32)'>
                    <path
                        className='LoadingAnimation__orbit LoadingAnimation__orbit--antimatter'
                        d={ORBIT_FROM_RIGHT}
                        pathLength={100}
                        fill='none'
                        strokeWidth='4.5'
                    />
                    <g className='LoadingAnimation__particle-container'>
                        <circle
                            className='LoadingAnimation__particle LoadingAnimation__particle--antimatter'
                            r='4.25'
                            strokeWidth='2.5'
                            cx={reducedMotion ? 57 : 0}
                            cy={reducedMotion ? 32 : 0}
                        >
                            {!reducedMotion && (
                                <animateMotion
                                    dur={ORBIT_DURATION}
                                    repeatCount='indefinite'
                                    path={ORBIT_FROM_RIGHT}
                                />
                            )}
                        </circle>
                    </g>
                </g>
                <g className='LoadingAnimation__spark-container'>
                    <path
                        className='LoadingAnimation__spark'
                        d={SPARK}
                    />
                </g>
            </g>
        </svg>
    );
}

export default LoadingIcon;
