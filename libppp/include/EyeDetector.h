#pragma once
#include "IDetector.h"

namespace cv
{
    class CascadeClassifier;
}

#define kEyeLeft true
#define kEyeRight false
#include <memory>

class EyeDetector : public IDetector
{
public:

    void configure(rapidjson::Value &cfg) override;

    bool detectLandMarks(const cv::Mat& inputImage, LandMarks &landmarks) override;

    
private:
	std::shared_ptr<cv::Mat> leftCornerKernel;
	std::shared_ptr<cv::Mat> rightCornerKernel;

private:  // Configuration

    bool m_useHaarCascades = false;
    std::shared_ptr<cv::CascadeClassifier> m_leftEyeCascadeClassifier;
    std::shared_ptr<cv::CascadeClassifier> m_rightEyeCascadeClassifier;

	// Definition of the search areas to locate pupils expressed as the ratios of the face rectangle
	const double m_topFaceRatio = 0.28;  ///<- Distance from the top of the face 
	const double m_sideFaceRatio = 0.13; ///<- Distance from the sides of the face rectangle
	const double m_widthRatio = 0.35;    ///<- ROI width 
	const double m_heightRatio = 0.25;   ///<- ROI height

	// Preprocessing
	const bool kSmoothFaceImage = false;
	const float kSmoothFaceFactor = 0.005f;

	// Algorithm Parameters
	const int kFastEyeWidth = 50;
	const int kWeightBlurSize = 5;
	const bool kEnableWeight = false;
	const float kWeightDivisor = 150.0;
	const double kGradientThreshold = 50.0;

	// Post-processing
	const bool kEnablePostProcess = true;
	const float kPostProcessThreshold = 0.97f;

	// Eye Corner
	const bool kEnableEyeCorner = false;

private:
    cv::Rect detectWithHaarCascadeClassifier(cv::Mat image, cv::CascadeClassifier *cc);

    cv::Point findEyeCenter(const cv::Mat& image);

	void createCornerKernels();
	cv::Mat eyeCornerMap(const cv::Mat& region, bool left, bool left2);
	
    void testPossibleCentersFormula(int x, int y, unsigned char weight, double gx, double gy, cv::Mat& out);
	

	cv::Mat floodKillEdges(cv::Mat& mat);
	cv::Mat computeMatXGradient(const cv::Mat &mat);
	cv::Mat matrixMagnitude(const cv::Mat& matX, const cv::Mat& matY);
	double computeDynamicThreshold(const cv::Mat& mat, double stdDevFactor);
	void releaseCornerKernels();
	cv::Point2f findEyeCorner(cv::Mat region, bool left, bool left2);
	cv::Point2f findSubpixelEyeCorner(cv::Mat region, cv::Point maxP);
	cv::Point unscalePoint(cv::Point p, cv::Rect origSize);
	void scaleToFastSize(const cv::Mat& src, cv::Mat& dst);



};