import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 // cn: Class Name
 // Tailwind CSS 클래스들을 조건부로 결합할 때 충돌 방지
 // * clsx: 조건에 따른 클래스 바인딩을 가능하게 함
 // * twMerge: 마지막에 오는 Tailwind 클래스로 우선 적용
 // */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs)) // clsx로 클래스들을 합친 뒤, twMerge로 Tailwind 속성 충돌을 정리하여 반환
}