import UIKit
import Capacitor

class CustomViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}
