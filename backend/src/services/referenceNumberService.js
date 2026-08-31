const prisma = require('../config/db');

const generateReferenceNumber = async (prefix = 'RES') => {
  const year = new Date().getFullYear();

  const lastAgreement = await prisma.rentalAgreement.findFirst({
    where: {
      referenceNumber: {
        startsWith: prefix + '-' + year
      }
    },
    orderBy: {
      referenceNumber: 'desc'
    }
  });

  let sequence = 1;
  if (lastAgreement && lastAgreement.referenceNumber) {
    const parts = lastAgreement.referenceNumber.split('-');
    if (parts.length === 3) {
      sequence = parseInt(parts[2]) + 1;
    }
  }

  const paddedSequence = String(sequence).padStart(5, '0');
  const referenceNumber = prefix + '-' + year + '-' + paddedSequence;

  return referenceNumber;
};

module.exports = {
  generateReferenceNumber
};