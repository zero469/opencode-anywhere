import UIKit
import Capacitor

class CustomViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.backgroundColor = .clear
        webView?.isOpaque = false
        webView?.scrollView.backgroundColor = .clear
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
