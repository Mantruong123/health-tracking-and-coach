# 4. Implementation and Evaluation

### 4.1 System Implementation and Testing Scenarios
Unlike traditional deep learning research that trains a model from scratch on a fixed corpus, the AuraFit project integrates a pre-trained edge model (Google ML Kit) into a real-time production environment. The primary implementation challenge was ensuring cross-platform stability and low latency on mobile hardware. 

For evaluation, rather than relying on a static video dataset, we established a dynamic testing protocol. Test subjects with varying body types and fitness levels performed the three core exercises (Push-ups, Squats, Arm Curls). Testing was conducted under three specific environmental conditions to stress-test the vision pipeline:
1. **Optimal Conditions**: Bright, even lighting; front or clear side camera angle; contrasting tight clothing.
2. **Poor Lighting**: Dimly lit rooms or strong backlighting obscuring the subject.
3. **Occlusion and Angles**: Suboptimal camera placement (e.g., extreme high/low angles) and loose clothing obscuring joints.

Every session was recorded, and a human evaluator manually logged the true number of repetitions and instances of incorrect form to establish a ground truth.

### 4.2 Experimental Settings
The mobile application was developed using Flutter (Dart 3) and tested exclusively on physical Android devices to accurately measure hardware performance. Testing utilized a mid-range device (equipped with a Snapdragon 7-series equivalent processor) and a high-end flagship device (Snapdragon 8-series equivalent). Emulators were deliberately excluded for performance evaluation because they do not accurately reflect mobile camera latency or edge NPU (Neural Processing Unit) capabilities.

The backend REST API was built with FastAPI (Python) and containerized using Docker Compose, connecting to a PostgreSQL instance. The primary evaluation metrics for the AI tracker were Processing Latency (measured in Frames Per Second - FPS) and Repetition Accuracy (the percentage of correctly counted reps versus the human ground truth).

### 4.3 Results and Analysis
The system successfully met its real-time processing targets, a critical requirement for interactive coaching. On the mid-range testing device, the Flutter application maintained an average of 22 FPS during active tracking, while the flagship device sustained a locked 30 FPS (the maximum throughput of the camera feed). This confirms that the lightweight BlazePose topology and our geometric state-machine logic do not bottleneck consumer hardware.

Table 2 presents the repetition counting accuracy across the three core exercises under optimal conditions.

| Exercise | Ground Truth Reps | System Counted Reps | Accuracy |
| :--- | :--- | :--- | :--- |
| Push-ups | 150 | 142 | 94.6% |
| Squats | 150 | 147 | 98.0% |
| Arm Curls | 150 | 149 | 99.3% |

*Table 2. Repetition counting accuracy against human ground truth.*

As shown in Table 2, Arm Curls achieved the highest accuracy (99.3%) because the movement is isolated to a single joint (the elbow) while the user remains relatively static and upright, making the landmarks easy for the model to track. Squats also performed strongly (98.0%). Push-ups exhibited the lowest accuracy (94.6%) primarily due to visual occlusion; when a user is in the lowest point of a push-up, their torso frequently blocks the camera's view of the far-side shoulder and elbow, causing brief tracking loss that disrupts the Finite State Machine.

When testing under suboptimal conditions, performance shifted predictably. Poor lighting resulted in a ~6% drop in accuracy across all exercises, as the underlying ML Kit model struggled to separate the user's limbs from the background. Interestingly, side-angle camera placements actually improved push-up and squat tracking compared to direct front-facing angles, as the depth occlusion was minimized and the crucial joint angles (elbow and knee, respectively) were fully exposed to the lens in 2D space.

For form correction, the system proved highly sensitive. The dual-layered heuristic logic successfully identified common mistakes, such as a rounded back during squats or partial extensions during bicep curls, triggering the Text-to-Speech warning with a perceived latency of under 400 milliseconds. However, the strict heuristic thresholds led to occasional over-detection, flagging borderline acceptable repetitions as invalid. This mirrors the precision-recall trade-offs seen in classical classification tasks: while deterministic geometric rules are fast, computationally cheap, and privacy-preserving, they occasionally lack the nuanced contextual forgiveness of a human trainer.
