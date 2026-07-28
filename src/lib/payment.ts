function upiParams(upiId: string, payeeName: string, amount: number, note: string) {
  return new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  }).toString();
}

// Generic UPI link — opens the phone's app chooser if multiple UPI apps are installed.
export function buildUpiLink(upiId: string, payeeName: string, amount: number, note: string) {
  return `upi://pay?${upiParams(upiId, payeeName, amount, note)}`;
}

// App-specific schemes jump straight into that app instead of showing a chooser.
export function buildPhonePeLink(upiId: string, payeeName: string, amount: number, note: string) {
  return `phonepe://pay?${upiParams(upiId, payeeName, amount, note)}`;
}

export function buildPaytmLink(upiId: string, payeeName: string, amount: number, note: string) {
  return `paytmmp://pay?${upiParams(upiId, payeeName, amount, note)}`;
}

export function buildGPayLink(upiId: string, payeeName: string, amount: number, note: string) {
  return `tez://upi/pay?${upiParams(upiId, payeeName, amount, note)}`;
}
