const getSummary = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Dashboard summary retrieved successfully',
    data: {
      totalAgreements: 0,
      activeAgreements: 0,
      pendingReview: 0,
      flaggedContracts: 0,
    },
  });
};

const getContracts = (req, res) => {
  const { referenceNumber, status, subCity, landlord, tenant } = req.query;

  res.status(200).json({
    success: true,
    message: 'Dashboard contracts retrieved successfully',
    filters: {
      referenceNumber,
      status,
      subCity,
      landlord,
      tenant,
    },
    data: [],
  });
};

const getCompliance = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Compliance records retrieved successfully',
    data: {
      underpayments: [],
      unauthorizedRentIncreases: [],
    },
  });
};
  
module.exports = {
  getSummary,
  getContracts,
  getCompliance,
};