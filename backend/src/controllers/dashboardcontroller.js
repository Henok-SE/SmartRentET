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

module.exports = {
  getSummary,
};