// SPDX-License-Identifier: GPL-3.0
/*
    Copyright 2021 0KIMS association.

    This file is generated with [snarkJS](https://github.com/iden3/snarkjs).

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

pragma solidity >=0.7.0 <0.9.0;

contract Groth16Verifier {
    // Scalar field size
    uint256 constant r    = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    // Base field size
    uint256 constant q   = 21888242871839275222246405745257275088696311157297823662689037894645226208583;

    // Verification Key data
    uint256 constant alphax  = 3132656793192654659206892502947419593274583507752736087883229168290711371584;
    uint256 constant alphay  = 6630768019637904141459987795906489705486463086619837584432233471374778845650;
    uint256 constant betax1  = 13684954398673251821559328496476125174585639550210584302611937757821809130506;
    uint256 constant betax2  = 20504651450025296577534569841238649384339689356018640067083819652642161126923;
    uint256 constant betay1  = 21501774295911104838282580367385418692406913514956772398555031038415387700017;
    uint256 constant betay2  = 12497510806513744851466511788239987133146289712152293539156555366603728284895;
    uint256 constant gammax1 = 11559732032986387107991004021392285783925812861821192530917403151452391805634;
    uint256 constant gammax2 = 10857046999023057135944570762232829481370756359578518086990519993285655852781;
    uint256 constant gammay1 = 4082367875863433681332203403145435568316851327593401208105741076214120093531;
    uint256 constant gammay2 = 8495653923123431417604973247489272438418190587263600148770280649306958101930;
    uint256 constant deltax1 = 10671712508389604445614918915449956073451778701352193296161618568968855738348;
    uint256 constant deltax2 = 6825752080695897658617253303910271714309353463828990088829192456710482643001;
    uint256 constant deltay1 = 12650207263566165478344158405389275021753655912411437209919912743407327704184;
    uint256 constant deltay2 = 5912367265470100318791960622830179064233973813534809186590392413956165251889;

    
    uint256 constant IC0x = 11121192019723276153865877747290789667677678522499737660740242320513842915792;
    uint256 constant IC0y = 1732881476025257131451205086388082731828353230333680806284258626929954640;
    
    uint256 constant IC1x = 2386607795402900301938245651863577893273681902991077230290564215630564381352;
    uint256 constant IC1y = 6439274972243846886394242439467414809792430381181247559741027716326766621578;
    
    uint256 constant IC2x = 1719193118565107385749324291255998721055561554727941992116446189320717376329;
    uint256 constant IC2y = 2134634191497054815647505522248931163226912575807859992691101695216109474827;
    
    uint256 constant IC3x = 6763515494012896844823233155033480237936179717453624922841019719431376115533;
    uint256 constant IC3y = 1221464119515203131371737622544294069238456195813166648737156205859376102009;
    
    uint256 constant IC4x = 429850753141895397749873748483067270469883271870898432571338488252874843710;
    uint256 constant IC4y = 16613092282566862578577690954413386625733041432604241364178220776739838956916;
    
    uint256 constant IC5x = 4129984355628067020017803431039626233972314505255306602011809049499693321654;
    uint256 constant IC5y = 584377876638499882462725446601075022063007927470424283967616755397551883776;
    
    uint256 constant IC6x = 4560083199833385490659437053806980438324741366721616010396632055770946567489;
    uint256 constant IC6y = 1646477600314994155020324766451004717424144508560615486593080124946606933486;
    
    uint256 constant IC7x = 14030955210077166997652767938733895201178050381052133660494585398954071506633;
    uint256 constant IC7y = 11593343005430051527208223585125794191884065098462748145506454124338797711512;
    
    uint256 constant IC8x = 17195403073149474404579575939890357650138109363046623235551529669177419285;
    uint256 constant IC8y = 2187823952922593658324657966822108314881958013011505033613149343439944259486;
    
    uint256 constant IC9x = 12800327969536076406977067779449024402651293252726433059129632621154823251739;
    uint256 constant IC9y = 21413239612922337049687874661174013275853600954631414388161189867213979302353;
    
    uint256 constant IC10x = 6478562019960436201849669014867348468267937102624117753270060885397487119254;
    uint256 constant IC10y = 5313948535066856592920306636433851239910098955924956559130775445454506355260;
    
    uint256 constant IC11x = 8283234466679833866783840177652796196075347310953046237500623073015288258502;
    uint256 constant IC11y = 20492265901770036729501587169705438677833112958018231861721012234414688191008;
    
    uint256 constant IC12x = 14856856130994508274649892666192622984219735509828941622987236392744592523741;
    uint256 constant IC12y = 117955306019162381667369205979561087629990740949066324116931890334233504897;
    
    uint256 constant IC13x = 18119687350007738113774961429272679999137923088811332674568852981401852086420;
    uint256 constant IC13y = 16589190833250802474494603569410470108213348384658890655712132761345034814765;
    
    uint256 constant IC14x = 4644597599594602052122959376490252166563235851410583256493335688089087301912;
    uint256 constant IC14y = 19511847561997107626177043588742566306274369900244438877430004096356263689049;
    
    uint256 constant IC15x = 14291619695378076340987727445706349503345421304614315685600780037109606897499;
    uint256 constant IC15y = 19079614694035123487763379975968346844976650653331339555808307317071330419510;
    
 
    // Memory data
    uint16 constant pVk = 0;
    uint16 constant pPairing = 128;

    uint16 constant pLastMem = 896;

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[15] calldata _pubSignals) public view returns (bool) {
        assembly {
            function checkField(v) {
                if iszero(lt(v, r)) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }
            
            // G1 function to multiply a G1 value(x,y) to value in an address
            function g1_mulAccC(pR, x, y, s) {
                let success
                let mIn := mload(0x40)
                mstore(mIn, x)
                mstore(add(mIn, 32), y)
                mstore(add(mIn, 64), s)

                success := staticcall(sub(gas(), 2000), 7, mIn, 96, mIn, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }

                mstore(add(mIn, 64), mload(pR))
                mstore(add(mIn, 96), mload(add(pR, 32)))

                success := staticcall(sub(gas(), 2000), 6, mIn, 128, pR, 64)

                if iszero(success) {
                    mstore(0, 0)
                    return(0, 0x20)
                }
            }

            function checkPairing(pA, pB, pC, pubSignals, pMem) -> isOk {
                let _pPairing := add(pMem, pPairing)
                let _pVk := add(pMem, pVk)

                mstore(_pVk, IC0x)
                mstore(add(_pVk, 32), IC0y)

                // Compute the linear combination vk_x
                
                g1_mulAccC(_pVk, IC1x, IC1y, calldataload(add(pubSignals, 0)))
                
                g1_mulAccC(_pVk, IC2x, IC2y, calldataload(add(pubSignals, 32)))
                
                g1_mulAccC(_pVk, IC3x, IC3y, calldataload(add(pubSignals, 64)))
                
                g1_mulAccC(_pVk, IC4x, IC4y, calldataload(add(pubSignals, 96)))
                
                g1_mulAccC(_pVk, IC5x, IC5y, calldataload(add(pubSignals, 128)))
                
                g1_mulAccC(_pVk, IC6x, IC6y, calldataload(add(pubSignals, 160)))
                
                g1_mulAccC(_pVk, IC7x, IC7y, calldataload(add(pubSignals, 192)))
                
                g1_mulAccC(_pVk, IC8x, IC8y, calldataload(add(pubSignals, 224)))
                
                g1_mulAccC(_pVk, IC9x, IC9y, calldataload(add(pubSignals, 256)))
                
                g1_mulAccC(_pVk, IC10x, IC10y, calldataload(add(pubSignals, 288)))
                
                g1_mulAccC(_pVk, IC11x, IC11y, calldataload(add(pubSignals, 320)))
                
                g1_mulAccC(_pVk, IC12x, IC12y, calldataload(add(pubSignals, 352)))
                
                g1_mulAccC(_pVk, IC13x, IC13y, calldataload(add(pubSignals, 384)))
                
                g1_mulAccC(_pVk, IC14x, IC14y, calldataload(add(pubSignals, 416)))
                
                g1_mulAccC(_pVk, IC15x, IC15y, calldataload(add(pubSignals, 448)))
                

                // -A
                mstore(_pPairing, calldataload(pA))
                mstore(add(_pPairing, 32), mod(sub(q, calldataload(add(pA, 32))), q))

                // B
                mstore(add(_pPairing, 64), calldataload(pB))
                mstore(add(_pPairing, 96), calldataload(add(pB, 32)))
                mstore(add(_pPairing, 128), calldataload(add(pB, 64)))
                mstore(add(_pPairing, 160), calldataload(add(pB, 96)))

                // alpha1
                mstore(add(_pPairing, 192), alphax)
                mstore(add(_pPairing, 224), alphay)

                // beta2
                mstore(add(_pPairing, 256), betax1)
                mstore(add(_pPairing, 288), betax2)
                mstore(add(_pPairing, 320), betay1)
                mstore(add(_pPairing, 352), betay2)

                // vk_x
                mstore(add(_pPairing, 384), mload(add(pMem, pVk)))
                mstore(add(_pPairing, 416), mload(add(pMem, add(pVk, 32))))


                // gamma2
                mstore(add(_pPairing, 448), gammax1)
                mstore(add(_pPairing, 480), gammax2)
                mstore(add(_pPairing, 512), gammay1)
                mstore(add(_pPairing, 544), gammay2)

                // C
                mstore(add(_pPairing, 576), calldataload(pC))
                mstore(add(_pPairing, 608), calldataload(add(pC, 32)))

                // delta2
                mstore(add(_pPairing, 640), deltax1)
                mstore(add(_pPairing, 672), deltax2)
                mstore(add(_pPairing, 704), deltay1)
                mstore(add(_pPairing, 736), deltay2)


                let success := staticcall(sub(gas(), 2000), 8, _pPairing, 768, _pPairing, 0x20)

                isOk := and(success, mload(_pPairing))
            }

            let pMem := mload(0x40)
            mstore(0x40, add(pMem, pLastMem))

            // Validate that all evaluations ∈ F
            
            checkField(calldataload(add(_pubSignals, 0)))
            
            checkField(calldataload(add(_pubSignals, 32)))
            
            checkField(calldataload(add(_pubSignals, 64)))
            
            checkField(calldataload(add(_pubSignals, 96)))
            
            checkField(calldataload(add(_pubSignals, 128)))
            
            checkField(calldataload(add(_pubSignals, 160)))
            
            checkField(calldataload(add(_pubSignals, 192)))
            
            checkField(calldataload(add(_pubSignals, 224)))
            
            checkField(calldataload(add(_pubSignals, 256)))
            
            checkField(calldataload(add(_pubSignals, 288)))
            
            checkField(calldataload(add(_pubSignals, 320)))
            
            checkField(calldataload(add(_pubSignals, 352)))
            
            checkField(calldataload(add(_pubSignals, 384)))
            
            checkField(calldataload(add(_pubSignals, 416)))
            
            checkField(calldataload(add(_pubSignals, 448)))
            

            // Validate all evaluations
            let isValid := checkPairing(_pA, _pB, _pC, _pubSignals, pMem)

            mstore(0, isValid)
             return(0, 0x20)
         }
     }
 }
