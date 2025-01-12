module.exports = {
    numberToWords: async (num) => {
        const belowTwenty = [
            'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
        ];
        const tens = [
            '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
        ];
        const aboveThousand = [
            '', 'Thousand', 'Lakh', 'Crore'
        ];

        function convertHundreds(n) {
            let result = '';
            if (n >= 100) {
                result += `${belowTwenty[Math.floor(n / 100)]} Hundred `;
                n %= 100;
            }
            if (n >= 20) {
                result += `${tens[Math.floor(n / 10)]} `;
                n %= 10;
            }
            if (n > 0) {
                result += `${belowTwenty[n]} `;
            }
            return result.trim();
        }

        function convertIndianRupees(num) {
            if (num === 0) return 'Zero';
            let result = '';
            let i = 0;

            while (num > 0) {
                const part = num % 1000;

                if (part > 0) {
                    result = `${convertHundreds(part)} ${aboveThousand[i]} ${result}`.trim();
                }

                if (i === 1) {
                    num = Math.floor(num / 100); // handle Thousand to Lakh correctly
                } else {
                    num = Math.floor(num / 1000); // for Lakh, Crore, etc.
                }
                i++;
            }
            return result.trim();
        }

        function convertPaise(decimalPart) {
            if (!decimalPart) return '';
            const fractionalNumber = parseInt(decimalPart, 10);
            if (fractionalNumber === 0) return '';
            return `and ${convertHundreds(fractionalNumber)} Paise`;
        }

        const [integerPart, decimalPart] = num.toString().split('.');

        const wordsForRupees = convertIndianRupees(parseInt(integerPart, 10));
        const wordsForPaise = decimalPart ? convertPaise(decimalPart.padEnd(2, '0')) : '';

        return wordsForRupees + ' Rupees' + (wordsForPaise ? ' ' + wordsForPaise : '');
    }
}